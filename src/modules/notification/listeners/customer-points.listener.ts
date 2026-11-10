import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MikroORM, RequestContext } from '@mikro-orm/core';

import {
  CUSTOMER_POINTS_ADDED_EVENT,
  CustomerPointsAddedEvent,
} from '../../customer/events/customer-points-added.event';
import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { pointsAddedMessage, ratingRequestMessage } from '../messages';
import { NotificationService } from '../notification.service';

/** Délai entre l'ajout de points et la demande d'avis : le client a fini sa visite */
export const RATING_REQUEST_DELAY_MS = 20 * 60 * 1000;

/**
 * Points crédités lors d'une visite : notification tout de suite, demande d'avis 20 minutes plus tard.
 * Asynchrone : l'ajout de points a déjà réussi, une notification ratée ne le remet pas en cause.
 */
@Injectable()
export class CustomerPointsListener {
  private readonly logger = new Logger(CustomerPointsListener.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly notificationService: NotificationService,
  ) {}

  @OnEvent(CUSTOMER_POINTS_ADDED_EVENT, { async: true })
  async handlePointsAdded({ userId, restaurantId, amount, balance }: CustomerPointsAddedEvent) {
    try {
      await RequestContext.create(this.orm.em, async () => {
        // Pour citer le restaurant dans les messages
        const restaurant = await this.orm.em.findOneOrFail(Restaurant, restaurantId);
        await this.notificationService.notify({
          userIds: [userId],
          category: 'points',
          message: pointsAddedMessage(amount, balance, restaurant),
          restaurantId,
        });
        await this.notificationService.notify({
          userIds: [userId],
          category: 'ratings',
          message: ratingRequestMessage(restaurant),
          restaurantId,
          delay: RATING_REQUEST_DELAY_MS,
          // Une nouvelle visite avant l'envoi n'ajoute pas une seconde demande
          key: `rating-request-${userId}-${restaurantId}`,
          duplicationMode: 'ignore',
        });
      });
    } catch (error) {
      this.logger.error(`Points notifications failed for user ${userId}`, error);
    }
  }
}
