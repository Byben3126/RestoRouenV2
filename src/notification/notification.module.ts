import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import * as OneSignal from '@onesignal/node-onesignal';

import { NotificationPreferences } from './entities';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PushNotificationListener } from './push-notification.listener';
import { ONESIGNAL_CLIENT, PushNotificationService } from './push-notification.service';
import { UserNotificationPreferencesController } from './user-notification-preferences.controller';

@Module({
  imports: [MikroOrmModule.forFeature([NotificationPreferences])],
  controllers: [UserNotificationPreferencesController],
  providers: [
    NotificationPreferencesService,
    PushNotificationService,
    PushNotificationListener,
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
