import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { NotificationPreferences } from './entities';
import { NotificationPreferencesService } from './notification-preferences.service';
import { UserNotificationPreferencesController } from './user-notification-preferences.controller';

@Module({
  imports: [MikroOrmModule.forFeature([NotificationPreferences])],
  controllers: [UserNotificationPreferencesController],
  providers: [NotificationPreferencesService],
})
export class NotificationModule {}
