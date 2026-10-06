import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RewardDto } from './dto';
import { RewardService } from './reward.service';

/** Récompenses d'un restaurant vues par un client (pas réservé au propriétaire) */
@ApiTags('Rewards')
@UseGuards(AuthGuard)
@Controller('restaurant/:restaurantId/rewards')
export class RestaurantRewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get()
  @Serialize(RewardDto)
  @ApiOkResponse({ type: RewardDto, isArray: true })
  getActiveRewards(@Param('restaurantId', ParseUUIDPipe) restaurantId: string) {
    return this.rewardService.getActiveRewards(restaurantId);
  }
}
