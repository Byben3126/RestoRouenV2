import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CustomerModule } from './customer/customer.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database';
import { DevModule } from './dev/dev.module';
import { MediaModule } from './media/media.module';
import { NotificationModule } from './notification/notification.module';
import { PromotionModule } from './promotion/promotion.module';
import { RatingModule } from './rating/rating.module';
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
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST ?? 'localhost',
          port: Number(process.env.REDIS_PORT ?? 6379),
        },
      }),
    }),
    AuthModule,
    UserModule,
    RestaurantModule,
    CustomerModule,
    RewardModule,
    PromotionModule,
    RatingModule,
    SubscriptionModule,
    DashboardModule,
    MediaModule,
    NotificationModule,
    RealtimeModule,
    AdminModule,
    DevModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
