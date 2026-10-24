import { Cursor, EntityRepository, RequiredEntityData } from '@mikro-orm/postgresql';

import { Notification } from '../entities/notification.entity';
import type { PushMessage } from '../push-notification.service';

export class NotificationRepository extends EntityRepository<Notification> {
  /** Une notification par utilisateur, enregistrées en un seul flush */
  async createForUsers(
    userIds: string[],
    message: PushMessage,
    restaurantId?: string,
  ): Promise<Notification[]> {
    const notifications = userIds.map((userId) =>
      this.create({
        user: userId,
        restaurant: restaurantId,
        ...message,
      } as RequiredEntityData<Notification>),
    );
    await this.em.flush();
    return notifications;
  }

  /** Les plus récentes d'abord. Par curseur : une nouvelle notification ne décale pas les pages suivantes */
  findPageForUser(
    userId: string,
    limit: number,
    after?: string,
  ): Promise<Cursor<Notification, 'restaurant', '*', never, false>> {
    return this.findByCursor(
      { user: userId },
      {
        first: limit,
        after,
        orderBy: { createdAt: 'DESC', id: 'DESC' },
        populate: ['restaurant'],
        includeCount: false,
      },
    );
  }

  async hasUnread(userId: string): Promise<boolean> {
    const count = await this.count({ user: userId, readAt: null });
    return count > 0;
  }

  /** null si la notification n'existe pas ou n'est pas à cet utilisateur */
  async markAsRead(userId: string, notificationId: string): Promise<Notification | null> {
    const notification = await this.findOne(
      { id: notificationId, user: userId },
      { populate: ['restaurant'] },
    );
    if (!notification) return null;

    notification.readAt ??= new Date();
    await this.em.flush();
    return notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.nativeUpdate({ user: userId, readAt: null }, { readAt: new Date() });
  }
}
