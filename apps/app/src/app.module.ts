import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { DatabaseModule } from '@app/database';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomerModule } from './customer/customer.module';
import { PromotionModule } from './promotion/promotion.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { RewardModule } from './reward/reward.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    DatabaseModule,
    EventEmitterModule.forRoot(),
    UserModule,
    RestaurantModule,
    CustomerModule,
    RewardModule,
    PromotionModule,
    SubscriptionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
