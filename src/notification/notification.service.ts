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

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: NotificationRepository,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly pushService: PushNotificationService,
  ) {}

  /**
   * Ajoute la notification au centre de notifications, toujours.
   * Le push n'est envoyé que si l'utilisateur veut cette catégorie (et ce restaurant).
   */
  async notify(
    userId: string,
    category: NotificationCategory,
    message: PushMessage,
    restaurantId?: string,
  ): Promise<void> {
    const notification = await this.notificationRepository.createForUser(
      userId,
      message,
      restaurantId,
    );

    const enabled = await this.preferencesService.isEnabled(userId, category, restaurantId);
    if (!enabled) return;

    // Au tap sur le push, l'app ouvre cette notification et la marque comme lue
    await this.pushService.sendToUsers([userId], {
      ...message,
      data: { ...message.data, notificationId: notification.id },
    });
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
}
