import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentRestaurant } from '../common/decorators/current-restaurant.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RestaurantOwnerGuard } from '../common/guards/restaurant-owner.guard';
import { CreateRewardDto, RewardDto, UpdateRewardDto, UseRewardDto } from './dto';
import { RewardStatus } from './entities/reward.entity';
import { RewardService } from './reward.service';

/** Gestion des récompenses par le propriétaire du restaurant connecté */
@ApiTags('Rewards')
@UseGuards(AuthGuard, RestaurantOwnerGuard)
@Controller('rewards')
export class OwnerRewardController {
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

  /** Scan du QR code du client : vérifie son token, débite ses points et lui remet la récompense */
  @Post('use')
  @HttpCode(200)
  @Serialize(RewardDto)
  @ApiOkResponse({ type: RewardDto })
  useReward(@CurrentRestaurant() restaurantId: string, @Body() dto: UseRewardDto) {
    return this.rewardService.useReward(restaurantId, dto.token);
  }
}
