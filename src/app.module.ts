import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CustomerModule } from './customer/customer.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database';
import { MediaModule } from './media/media.module';
import { NotificationModule } from './notification/notification.module';
import { PromotionModule } from './promotion/promotion.module';
import { RealtimeModule } from './realtime/realtime.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { RewardModule } from './reward/reward.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    RestaurantModule,
    CustomerModule,
    RewardModule,
    PromotionModule,
    SubscriptionModule,
    DashboardModule,
    MediaModule,
    NotificationModule,
    RealtimeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
