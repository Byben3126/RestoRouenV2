import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

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
  @ApiOkResponse({ type: RewardTokenDto })
  createRewardToken(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) rewardId: string) {
    return this.rewardService.createRewardToken(userId, rewardId);
  }
}
