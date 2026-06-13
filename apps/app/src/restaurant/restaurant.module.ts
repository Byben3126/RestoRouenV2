import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Restaurant } from './entities';

@Module({
  imports: [MikroOrmModule.forFeature([Restaurant])],
})
export class RestaurantModule {}
