import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@mikro-orm/nestjs';

import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { Reward, RewardStatus } from './entities/reward.entity';
import { RewardRepository } from './repositories/reward.repository';

@Injectable()
export class RewardService {
  constructor(
    @InjectRepository(Reward)
    private readonly rewardRepository: RewardRepository,
  ) {}

  getRestaurantRewards(restaurantId: string): Promise<Reward[]> {
    return this.rewardRepository.findByRestaurant(restaurantId);
  }

  createReward(restaurantId: string, dto: CreateRewardDto): Promise<Reward> {
    return this.rewardRepository.createForRestaurant(restaurantId, dto);
  }

  async updateReward(
    restaurantId: string,
    rewardId: string,
    dto: UpdateRewardDto,
  ): Promise<Reward> {
    const reward = await this.rewardRepository.updateForRestaurant(restaurantId, rewardId, dto);
    if (!reward) throw new NotFoundException('Reward not found');
    return reward;
  }

  async setStatus(restaurantId: string, rewardId: string, status: RewardStatus): Promise<Reward> {
    const reward = await this.rewardRepository.setStatusForRestaurant(
      restaurantId,
      rewardId,
      status,
    );
    if (!reward) throw new NotFoundException('Reward not found');
    return reward;
  }
}
