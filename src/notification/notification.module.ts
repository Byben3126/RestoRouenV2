import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { OneSignalModule } from '../onesignal/onesignal.module';
import { Notification, NotificationPreferences } from './entities';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationPurgeTask } from './notification-purge.task';
import { NotificationListener } from './notification.listener';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';
import { UserNotificationPreferencesController } from './user-notification-preferences.controller';
import { UserNotificationController } from './user-notification.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Notification, NotificationPreferences]), OneSignalModule],
  controllers: [UserNotificationController, UserNotificationPreferencesController],
  providers: [
    NotificationService,
    NotificationPreferencesService,
    PushNotificationService,
    NotificationListener,
    NotificationPurgeTask,
  ],
})
export class NotificationModule {}
