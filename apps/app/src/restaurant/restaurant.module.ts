import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { SubscriptionModule } from '../subscription/subscription.module';
import { Restaurant } from './entities';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';

@Module({
  imports: [MikroOrmModule.forFeature([Restaurant]), SubscriptionModule],
  controllers: [RestaurantController],
  providers: [RestaurantService],
})
export class RestaurantModule {}
