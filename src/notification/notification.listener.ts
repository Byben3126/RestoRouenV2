import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MikroORM, RequestContext } from '@mikro-orm/core';

import {
  CUSTOMER_POINTS_ADDED_EVENT,
  CustomerPointsAddedEvent,
} from '../customer/events/customer-points-added.event';
import { Restaurant } from '../restaurant/entities/restaurant.entity';
import { pointsAddedMessage } from './messages';
import { NotificationService } from './notification.service';

/**
 * Notifie l'utilisateur des événements métier (centre de notifications et push).
 * Asynchrone : l'action (ex. l'ajout de points) a déjà réussi, une notification ratée ne la remet pas en cause.
 */
@Injectable()
export class NotificationListener {
  private readonly logger = new Logger(NotificationListener.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(CUSTOMER_POINTS_ADDED_EVENT, { async: true })
  async handlePointsAdded({ userId, restaurantId, amount, balance }: CustomerPointsAddedEvent) {
    try {
      await RequestContext.create(this.orm.em, async () => {
        // Pour citer le restaurant dans le message
        const restaurant = await this.orm.em.findOneOrFail(Restaurant, restaurantId);
        await this.notificationService.notify(
          [userId],
          'points',
          pointsAddedMessage(amount, balance, restaurant),
          restaurantId,
        );
      });
    } catch (error) {
      this.logger.error(`Points notification failed for user ${userId}`, error);
    }
  }
}
