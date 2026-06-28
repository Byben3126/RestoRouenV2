import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Serialize } from '@main/common/decorators/serialize.decorator';

import { CurrentRestaurant } from '../common/decorators/current-restaurant.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RestaurantOwnerGuard } from '../common/guards/restaurant-owner.guard';
import { CreateRewardDto, RewardDto, UpdateRewardDto } from './dto';
import { RewardStatus } from './entities/reward.entity';
import { RewardService } from './reward.service';

@ApiTags('Rewards')
@UseGuards(AuthGuard, RestaurantOwnerGuard)
@Controller('rewards')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get()
  @Serialize(RewardDto, ['owner'])
  @ApiOkResponse({ type: RewardDto, isArray: true })
  getRestaurantRewards(@CurrentRestaurant() restaurantId: string) {
    return this.rewardService.getRestaurantRewards(restaurantId);
  }

  @Post()
  @Serialize(RewardDto, ['owner'])
  @ApiCreatedResponse({ type: RewardDto })
  createReward(@CurrentRestaurant() restaurantId: string, @Body() dto: CreateRewardDto) {
    return this.rewardService.createReward(restaurantId, dto);
  }

  @Patch(':id')
  @Serialize(RewardDto, ['owner'])
  @ApiOkResponse({ type: RewardDto })
  updateReward(
    @CurrentRestaurant() restaurantId: string,
    @Param('id') rewardId: string,
    @Body() dto: UpdateRewardDto,
  ) {
    return this.rewardService.updateReward(restaurantId, rewardId, dto);
  }

  @Patch(':id/archive')
  @Serialize(RewardDto, ['owner'])
  @ApiOkResponse({ type: RewardDto })
  archiveReward(@CurrentRestaurant() restaurantId: string, @Param('id') rewardId: string) {
    return this.rewardService.setStatus(restaurantId, rewardId, RewardStatus.ARCHIVED);
  }

  @Patch(':id/draft')
  @Serialize(RewardDto, ['owner'])
  @ApiOkResponse({ type: RewardDto })
  draftReward(@CurrentRestaurant() restaurantId: string, @Param('id') rewardId: string) {
    return this.rewardService.setStatus(restaurantId, rewardId, RewardStatus.DRAFT);
  }

  @Patch(':id/publish')
  @Serialize(RewardDto, ['owner'])
  @ApiOkResponse({ type: RewardDto })
  publishReward(@CurrentRestaurant() restaurantId: string, @Param('id') rewardId: string) {
    return this.rewardService.setStatus(restaurantId, rewardId, RewardStatus.ACTIVE);
  }
}
