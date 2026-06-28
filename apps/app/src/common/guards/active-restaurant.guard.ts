import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

import { EntityManager } from '@mikro-orm/core';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import {
  Subscription,
  SubscriptionStatus,
} from '../../subscription/entities/subscription_restaurant.entity';

const ACTIVE_STATUSES = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];

@Injectable()
export class ActiveRestaurantGuard implements CanActivate {
  constructor(private readonly em: EntityManager) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ userId: string; restaurantId: string }>();

    const restaurant = await this.em.findOne(Restaurant, { user: { authUser: request.userId } });
    if (!restaurant) throw new ForbiddenException('No restaurant found for this user');

    request.restaurantId = restaurant.id;

    const subscription = await this.em.findOne(Subscription, {
      restaurant: restaurant.id,
      status: { $in: ACTIVE_STATUSES },
    });

    if (!subscription)
      throw new HttpException('No active subscription', HttpStatus.PAYMENT_REQUIRED);

    return true;
  }
}
