import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { Cursor } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';

import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { Notification } from './entities/notification.entity';
import {
  NotificationCategory,
  NotificationPreferencesService,
} from './notification-preferences.service';
import { PushMessage, PushNotificationService } from './push-notification.service';
import { NotificationRepository } from './repositories/notification.repository';

const NOTIFICATION_RETENTION_DAYS = 90;

@Injectable()
export class NotificationService {
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
  async notify(
    userIds: string[],
    category: NotificationCategory,
    message: PushMessage,
    restaurantId?: string,
  ): Promise<void> {
    if (userIds.length === 0) return;

    await this.notificationRepository.createForUsers(userIds, message, restaurantId);

    const recipients = await this.preferencesService.filterEnabled(userIds, category, restaurantId);
    await this.pushService.sendToUsers(recipients, message);
  }

  async getNotifications(userId: string, { after, limit }: GetNotificationsQueryDto) {
    if (after) {
      try {
        Cursor.decode(after);
      } catch {
        throw new BadRequestException('Invalid cursor');
      }
    }

    const page = await this.notificationRepository.findPageForUser(userId, limit, after);
    return { items: page.items, nextCursor: page.hasNextPage ? page.endCursor : null };
  }

  async hasUnread(userId: string) {
    return { hasUnread: await this.notificationRepository.hasUnread(userId) };
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.markAsRead(userId, notificationId);
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  markAllAsRead(userId: string): Promise<void> {
    return this.notificationRepository.markAllAsRead(userId);
  }

  /** Compte supprimé : vide son centre de notifications */
  deleteForUser(userId: string): Promise<void> {
    return this.notificationRepository.deleteForUser(userId);
  }

  /** Supprime les notifications de plus de 90 jours ; retourne leur nombre */
  purgeOld(): Promise<number> {
    const before = new Date();
    before.setDate(before.getDate() - NOTIFICATION_RETENTION_DAYS);
    return this.notificationRepository.deleteCreatedBefore(before);
  }
}
