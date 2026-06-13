import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Promotion, PromotionTarget, PromotionUsed } from './entities';

@Module({
  imports: [MikroOrmModule.forFeature([Promotion, PromotionTarget, PromotionUsed])],
})
export class PromotionModule {}
