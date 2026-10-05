import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { SubscriptionModule } from '../subscription/subscription.module';
import { Outlet, Restaurant } from './entities';
import { OutletController } from './outlet.controller';
import { OutletService } from './outlet.service';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';

@Module({
  imports: [MikroOrmModule.forFeature([Restaurant, Outlet]), SubscriptionModule],
  controllers: [RestaurantController, OutletController],
  providers: [RestaurantService, OutletService],
})
export class RestaurantModule {}
