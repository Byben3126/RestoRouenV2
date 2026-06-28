import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Reward, RewardUsed } from './entities';
import { RewardController } from './reward.controller';
import { RewardService } from './reward.service';

@Module({
  imports: [MikroOrmModule.forFeature([Reward, RewardUsed])],
  controllers: [RewardController],
  providers: [RewardService],
})
export class RewardModule {}
