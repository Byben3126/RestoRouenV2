import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MikroORM, RequestContext } from '@mikro-orm/core';

import { USER_CREATED_EVENT, UserCreatedEvent } from '../../user/events/user-created.event';
import { SubscriptionService } from '../subscription.service';

@Injectable()
export class UserCreatedListener {
  private readonly logger = new Logger(UserCreatedListener.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @OnEvent(USER_CREATED_EVENT, { async: true })
  async handleUserCreated({ userId }: UserCreatedEvent) {
    try {
      await RequestContext.create(this.orm.em, () =>
        this.subscriptionService.ensureStripeCustomer(userId),
      );
    } catch (error) {
      // Sans client Stripe ici, il est créé au premier checkout ou à la création du restaurant
      this.logger.error(`Stripe customer creation failed for user ${userId}`, error);
    }
  }
}
