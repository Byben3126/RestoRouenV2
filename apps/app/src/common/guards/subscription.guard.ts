import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/core';

import { Subscription, SubscriptionStatus } from '../../subscription/entities/subscription_restaurant.entity';

const ACTIVE_STATUSES = [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING];

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(private readonly em: EntityManager) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ restaurantId: string }>();

    const subscription = await this.em.findOne(Subscription, {
      restaurant: request.restaurantId,
      status: { $in: ACTIVE_STATUSES },
    });

    if (!subscription) throw new HttpException('No active subscription', HttpStatus.PAYMENT_REQUIRED);

    return true;
  }
}
