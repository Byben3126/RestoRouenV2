import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiOkWrappedResponse } from '../common/decorators/api-response.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { RewardTokenDto } from './dto';
import { RewardService } from './reward.service';

/** Récompenses de l'utilisateur connecté */
@ApiTags('Rewards')
@Controller('users/me/rewards')
export class UserRewardController {
  constructor(private readonly rewardService: RewardService) {}

  /** Token signé prouvant que l'utilisateur demande à récupérer cette récompense (QR code, 10 min) */
  @Get(':id/token')
  @Serialize(RewardTokenDto)
  @ApiOkWrappedResponse({ type: RewardTokenDto })
  createRewardToken(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) rewardId: string) {
    return this.rewardService.createRewardToken(userId, rewardId);
  }
}
