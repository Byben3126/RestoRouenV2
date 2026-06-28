import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';
import Stripe from 'stripe';

import { Restaurant } from '../restaurant/entities/restaurant.entity';
import { AppUser } from '../user/entities/app-user.entity';
import { UserCreatedEvent } from '../user/events/user-created.event';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from './entities/subscription_restaurant.entity';
import { SubscriptionRepository } from './repositories/subscription.repository';

@Injectable()
export class SubscriptionService {
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly em: EntityManager,
  ) {}

  @OnEvent('user.created')
  async handleUserCreated(event: UserCreatedEvent): Promise<void> {
    try {
      await this.ensureStripeCustomer(event.userId);
    } catch {
      // best-effort — will be created lazily at onboarding
    }
  }

  async ensureStripeCustomer(userId: string): Promise<string> {
    const appUser = await this.em.findOne(
      AppUser,
      { authUser: userId },
      { populate: ['authUser'] },
    );
    if (!appUser) throw new NotFoundException('User not found');

    if (appUser.stripeCustomerId) return appUser.stripeCustomerId;

    const resolvedEmail = appUser.authUser?.email;
    const customer = await this.stripe.customers.create({
      email: resolvedEmail,
      metadata: { userId },
    });

    appUser.stripeCustomerId = customer.id;
    await this.em.flush();

    return customer.id;
  }

  async createPortalSession(userId: string): Promise<string> {
    const stripeCustomerId = await this.ensureStripeCustomer(userId);

    const session = await this.stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    return session.url;
  }

  async createCheckoutSession(
    userId: string,
    restaurantId: string,
    plan: SubscriptionPlan,
  ): Promise<string> {
    const existing = await this.subscriptionRepository.findByRestaurantId(restaurantId);
    if (
      existing &&
      [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING].includes(existing.status)
    ) {
      throw new ConflictException('An active subscription already exists for this restaurant');
    }

    const stripeCustomerId = await this.ensureStripeCustomer(userId);

    const productId = {
      [SubscriptionPlan.STARTER]: process.env.STRIPE_PRODUCT_STARTER!,
      [SubscriptionPlan.GROWTH]: process.env.STRIPE_PRODUCT_GROWTH!,
      [SubscriptionPlan.PRO]: process.env.STRIPE_PRODUCT_PRO!,
    }[plan];

    const prices = await this.stripe.prices.list({
      product: productId,
      active: true,
      type: 'recurring',
      limit: 1,
    });
    if (!prices.data.length) throw new Error(`No active price found for plan ${plan}`);

    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      line_items: [{ price: prices.data[0].id, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard/home?checkout=success`,
      cancel_url: `${process.env.FRONTEND_URL}/onboarding`,
      metadata: { restaurantId, plan },
    });

    return session.url!;
  }

  async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const { restaurantId, plan } = session.metadata as {
      restaurantId: string;
      plan: SubscriptionPlan;
    };
    if (!restaurantId || !plan) return;

    const stripeSubscription = await this.stripe.subscriptions.retrieve(
      session.subscription as string,
    );
    const sub = stripeSubscription as any;

    const existing = await this.subscriptionRepository.findOne({ restaurant: restaurantId });

    if (existing) {
      existing.stripeSubscriptionId = stripeSubscription.id;
      existing.status = stripeSubscription.status as SubscriptionStatus;
      existing.currentPeriodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : undefined;
      existing.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    } else {
      this.em.create(Subscription, {
        restaurant: this.em.getReference(Restaurant, restaurantId),
        plan,
        stripeSubscriptionId: stripeSubscription.id,
        status: stripeSubscription.status as SubscriptionStatus,
        currentPeriodEnd: sub.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : undefined,
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      } as any);
    }

    await this.em.flush();
  }

  async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const inv = invoice as any;
    const stripeSubscriptionId = inv.parent?.subscription_details?.subscription;
    if (!stripeSubscriptionId) return;

    const periodEnd = inv.lines?.data?.[0]?.period?.end;
    if (!periodEnd) return;

    let subscription = await this.subscriptionRepository.findOne({ stripeSubscriptionId });

    if (!subscription) {
      const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
      if (!stripeCustomerId) return;

      const appUser = await this.em.findOne(AppUser, { stripeCustomerId });
      if (!appUser) return;

      const restaurant = await this.em.findOne(Restaurant, { user: appUser.id });
      if (!restaurant) return;

      subscription = await this.subscriptionRepository.findOne({ restaurant: restaurant.id });
      if (!subscription) return;

      subscription.stripeSubscriptionId = stripeSubscriptionId;
    }

    subscription.currentPeriodEnd = new Date(periodEnd * 1000);
    await this.em.flush();
  }

  async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });
    if (!subscription) return;

    const sub = stripeSubscription as any;
    subscription.status = stripeSubscription.status as SubscriptionStatus;
    subscription.currentPeriodEnd = sub.current_period_end
      ? new Date(sub.current_period_end * 1000)
      : undefined;
    subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
    await this.em.flush();
  }

  async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });
    if (!subscription) return;

    subscription.status = SubscriptionStatus.CANCELED;
    await this.em.flush();
  }

  async getForRestaurant(restaurantId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findByRestaurantId(restaurantId);
    if (!subscription) throw new NotFoundException('Subscription not found');
    return subscription;
  }

  async createForRestaurant(
    restaurantId: string,
    dto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    const subscription = this.em.create(Subscription, {
      restaurant: this.em.getReference(Restaurant, restaurantId),
      plan: dto.plan,
    } as any);
    await this.em.flush();
    return subscription;
  }

  async update(subscriptionId: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({ id: subscriptionId });
    if (!subscription) throw new NotFoundException('Subscription not found');
    this.em.assign(subscription, dto);
    await this.em.flush();
    return subscription;
  }
}
