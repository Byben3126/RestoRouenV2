import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

import { MikroORM, RequestContext } from '@mikro-orm/core';
import { Job } from 'bullmq';

import { NotificationSender, NotificationToSend } from '../notification.sender';
import { NOTIFICATIONS_QUEUE } from './notification.constants';

/** Traite la file des notifications : chaque job est envoyé par NotificationSender */
@Processor(NOTIFICATIONS_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly orm: MikroORM,
    private readonly sender: NotificationSender,
  ) {
    super();
  }

  /** Une erreur fait échouer le job : BullMQ le relance (voir defaultJobOptions dans NotificationModule) */
  async process(job: Job<NotificationToSend>): Promise<void> {
    await RequestContext.create(this.orm.em, () => this.sender.send(job.data));
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`Notification job ${job?.id} failed (attempt ${job?.attemptsMade})`, error);
  }
}
