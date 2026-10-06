import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Promotion, PromotionTarget, PromotionUsed } from './entities';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { RestaurantPromotionController } from './restaurant-promotion.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Promotion, PromotionTarget, PromotionUsed])],
  controllers: [PromotionController, RestaurantPromotionController],
  providers: [PromotionService],
})
export class PromotionModule {}
