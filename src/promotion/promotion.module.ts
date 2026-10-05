import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Promotion, PromotionTarget, PromotionUsed } from './entities';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';

@Module({
  imports: [MikroOrmModule.forFeature([Promotion, PromotionTarget, PromotionUsed])],
  controllers: [PromotionController],
  providers: [PromotionService],
})
export class PromotionModule {}
