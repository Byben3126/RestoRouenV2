import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MikroORM, RequestContext } from '@mikro-orm/core';

import {
  CUSTOMER_POINTS_ADDED_EVENT,
  CustomerPointsAddedEvent,
} from '../customer/events/customer-points-added.event';
import { Restaurant } from '../restaurant/entities/restaurant.entity';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PushNotificationService } from './push-notification.service';

/**
 * Envoie les push des événements métier, selon les préférences de l'utilisateur.
 * Asynchrone : l'action (ex. l'ajout de points) a déjà réussi, une push ratée ne la remet pas en cause.
 */
@Injectable()
export class PushNotificationListener {
  private readonly logger = new Logger(PushNotificationListener.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly pushService: PushNotificationService,
  ) {}

  @OnEvent(CUSTOMER_POINTS_ADDED_EVENT, { async: true })
  async handlePointsAdded({ userId, restaurantId, amount, balance }: CustomerPointsAddedEvent) {
    try {
      await RequestContext.create(this.orm.em, async () => {
        const enabled = await this.preferencesService.isEnabled(userId, 'points', restaurantId);
        if (!enabled) return;

        // Pour citer le restaurant dans le message
        const { name } = await this.orm.em.findOneOrFail(Restaurant, restaurantId);
        const plural = amount > 1;
        await this.pushService.sendToUsers([userId], {
          headings: {
            fr: `+${amount} point${plural ? 's' : ''} chez ${name} !`,
            en: `+${amount} point${plural ? 's' : ''} at ${name}!`,
            es: `¡+${amount} punto${plural ? 's' : ''} en ${name}!`,
          },
          contents: {
            fr: `Votre solde : ${balance} points.`,
            en: `Your balance: ${balance} points.`,
            es: `Tu saldo: ${balance} puntos.`,
          },
          data: { type: 'points.added', restaurantId },
        });
      });
    } catch (error) {
      this.logger.error(`Points push failed for user ${userId}`, error);
    }
  }
}
