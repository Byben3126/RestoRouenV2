import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { OneSignalModule } from '../onesignal/onesignal.module';
import { Notification, NotificationPreferences } from './entities';
import { CustomerPointsListener } from './listeners/customer-points.listener';
import { UserDeletedListener } from './listeners/user-deleted.listener';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPurgeTask } from './notification-purge.task';
import { NotificationSender } from './notification.sender';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';
import { NOTIFICATIONS_QUEUE } from './queue/notification.constants';
import { NotificationProcessor } from './queue/notification.processor';
import { UserNotificationPreferencesController } from './user-notification-preferences.controller';
import { UserNotificationController } from './user-notification.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([Notification, NotificationPreferences]),
    OneSignalModule,
    BullModule.registerQueue({
      name: NOTIFICATIONS_QUEUE,
      defaultJobOptions: {
        // Base ou OneSignal indisponible : 3 essais, à 10 s puis 20 s d'intervalle
        attempts: 3,
        backoff: { type: 'exponential', delay: 10_000 },
        // Les 100 derniers envois restent visibles dans Bull Board
        removeOnComplete: { count: 100 },
        // Les échecs restent 7 jours dans Redis pour comprendre ce qui s'est passé
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    }),
  ],
  controllers: [UserNotificationController, UserNotificationPreferencesController],
  providers: [
    NotificationService,
    NotificationPreferencesService,
    NotificationSender,
    PushNotificationService,
    NotificationProcessor,
    CustomerPointsListener,
    UserDeletedListener,
    NotificationPurgeTask,
  ],
  // Les autres modules envoient des notifications par notify, jamais directement
  exports: [NotificationService],
})
export class NotificationModule {}
