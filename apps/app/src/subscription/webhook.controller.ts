import { BadRequestException, Controller, Headers, Post, RawBody } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import Stripe from 'stripe';

import { SubscriptionService } from './subscription.service';

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  private readonly stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('stripe')
  async handleStripeWebhook(
    @RawBody() rawBody: Buffer,
    @Headers('stripe-signature') signature: string,
  ) {
    let event: Stripe.Event;

    console.log('Received Stripe webhook event:', { signature, rawBody: rawBody.toString() });

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch {
      throw new BadRequestException('Invalid Stripe signature');
    }
    console.log('Verified Stripe webhook event:', event);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.subscriptionService.handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.updated':
        await this.subscriptionService.handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await this.subscriptionService.handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await this.subscriptionService.handleInvoicePaymentSucceeded(event.data.object);
        break;
    }

    return { received: true };
  }
}
