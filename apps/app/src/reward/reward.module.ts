import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Reward } from './entities';

@Module({
  imports: [MikroOrmModule.forFeature([Reward])],
})
export class RewardModule {}
