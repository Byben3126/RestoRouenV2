import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { MikroORM, RequestContext } from '@mikro-orm/core';

import { NotificationService } from './notification.service';

/** Garde le centre de notifications léger : les vieilles notifications ne sont plus utiles */
@Injectable()
export class NotificationPurgeTask {
  private readonly logger = new Logger(NotificationPurgeTask.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeOldNotifications() {
    try {
      const count = await RequestContext.create(this.orm.em, () =>
        this.notificationService.purgeOld(),
      );
      this.logger.log(`${count} old notifications purged`);
    } catch (error) {
      this.logger.error('Notification purge failed', error);
    }
  }
}
