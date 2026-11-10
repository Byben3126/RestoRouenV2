import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@mikro-orm/nestjs';

import { Notification } from './entities/notification.entity';
import {
  NotificationCategory,
  NotificationPreferencesService,
} from './notification-preferences.service';
import { PushMessage, PushNotificationService } from './push-notification.service';
import { NotificationRepository } from './repositories/notification.repository';

/** Une notification prête à partir : c'est la donnée d'un job de la file */
export interface NotificationToSend {
  userIds: string[];
  category: NotificationCategory;
  message: PushMessage;
  restaurantId?: string;
}

/**
 * Envoi réel, appelé uniquement par la file (NotificationProcessor). Interne au module :
 * pour envoyer une notification, passer par NotificationService.notify.
 */
@Injectable()
export class NotificationSender {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: NotificationRepository,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly pushService: PushNotificationService,
  ) {}

  /**
   * Ajoute la notification au centre de notifications de chaque utilisateur, toujours.
   * Un seul push, aux utilisateurs qui veulent cette catégorie (et ce restaurant) : son data est
   * le même pour tous, il ne peut donc pas porter l'id de chaque notification.
   */
  async send({ userIds, category, message, restaurantId }: NotificationToSend): Promise<void> {
    if (userIds.length === 0) return;

    await this.notificationRepository.createForUsers(userIds, message, restaurantId);

    const recipients = await this.preferencesService.filterEnabled(userIds, category, restaurantId);
    await this.pushService.sendToUsers(recipients, message);
  }
}
