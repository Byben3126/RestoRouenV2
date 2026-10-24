import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import * as OneSignal from '@onesignal/node-onesignal';

import { Notification, NotificationPreferences } from './entities';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPurgeTask } from './notification-purge.task';
import { NotificationListener } from './notification.listener';
import { NotificationService } from './notification.service';
import { ONESIGNAL_CLIENT, PushNotificationService } from './push-notification.service';
import { UserNotificationPreferencesController } from './user-notification-preferences.controller';
import { UserNotificationController } from './user-notification.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Notification, NotificationPreferences])],
  controllers: [UserNotificationController, UserNotificationPreferencesController],
  providers: [
    NotificationService,
    NotificationPreferencesService,
    PushNotificationService,
    NotificationListener,
    NotificationPurgeTask,
    {
      provide: ONESIGNAL_CLIENT,
      useFactory: () =>
        process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY
          ? new OneSignal.DefaultApi(
              OneSignal.createConfiguration({ restApiKey: process.env.ONESIGNAL_REST_API_KEY }),
            )
          : null,
    },
  ],
})
export class NotificationModule {}
