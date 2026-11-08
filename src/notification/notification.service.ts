import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { Cursor } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { JobsOptions, Queue } from 'bullmq';

import { GetNotificationsQueryDto } from './dto/get-notifications-query.dto';
import { Notification } from './entities/notification.entity';
import { NotificationToSend } from './notification.sender';
import { NOTIFICATIONS_QUEUE, SEND_NOTIFICATION_JOB } from './queue/notification.constants';
import { NotificationRepository } from './repositories/notification.repository';

const NOTIFICATION_RETENTION_DAYS = 90;

export interface NotifyParams extends NotificationToSend {
  delay?: number;
  key?: string;
  /** Sans mode, la clé est sans effet. replace ne remplace qu'une notification encore différée */
  duplicationMode?: 'ignore' | 'replace';
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: NotificationRepository,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  async notify({ delay, key, duplicationMode, ...notification }: NotifyParams): Promise<void> {
    if (notification.userIds.length === 0) return;
    const addOpts: JobsOptions = {
      delay,
      deduplication:
        key && duplicationMode ? { id: key, replace: duplicationMode === 'replace' } : undefined,
    };
    await this.queue.add(SEND_NOTIFICATION_JOB, notification satisfies NotificationToSend, addOpts);
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
