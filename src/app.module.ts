import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { redisConnection } from './config/redis.config';
import { DatabaseModule } from './infrastructure/database';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomerModule } from './modules/customer/customer.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { DevModule } from './modules/dev/dev.module';
import { GoogleModule } from './modules/google/google.module';
import { HubriseModule } from './modules/hubrise/hubrise.module';
import { MediaModule } from './modules/media/media.module';
import { NotificationModule } from './modules/notification/notification.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { RatingModule } from './modules/rating/rating.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { RestaurantModule } from './modules/restaurant/restaurant.module';
import { RewardModule } from './modules/reward/reward.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { UserModule } from './modules/user/user.module';
import { WalletModule } from './modules/wallet/wallet.module';

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({ useFactory: () => ({ connection: redisConnection() }) }),
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
    WalletModule,
    GoogleModule,
    HubriseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
