import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Reward, RewardUsed } from './entities';

@Module({
  imports: [MikroOrmModule.forFeature([Reward, RewardUsed])],
})
export class RewardModule {}
