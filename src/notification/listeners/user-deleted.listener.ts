import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MikroORM, RequestContext } from '@mikro-orm/core';

import { USER_DELETED_EVENT, UserDeletedEvent } from '../../user/events/user-deleted.event';
import { NotificationPreferencesService } from '../notification-preferences.service';
import { NotificationService } from '../notification.service';

/** Compte supprimé : vide son centre de notifications et ses préférences */
@Injectable()
export class UserDeletedListener {
  private readonly logger = new Logger(UserDeletedListener.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly notificationService: NotificationService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @OnEvent(USER_DELETED_EVENT, { async: true })
  async handleUserDeleted({ userId }: UserDeletedEvent) {
    try {
      await RequestContext.create(this.orm.em, async () => {
        await this.notificationService.deleteForUser(userId);
        await this.preferencesService.deletePreferences(userId);
      });
    } catch (error) {
      this.logger.error(`Notification cleanup failed for deleted user ${userId}`, error);
    }
  }
}
