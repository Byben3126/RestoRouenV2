import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { HubriseCallbackQueryDto } from './dto/hubrise.dto';
import { HubriseService } from './hubrise.service';

@ApiTags('HubRise')
@AllowAnonymous()
@Controller('hubrize')
export class HubriseController {
  constructor(private readonly hubriseService: HubriseService) {}

  /** HubRise y renvoie le navigateur une fois l'accès autorisé depuis la fiche restaurant de l'admin */
  @Get('oauth/callback/:restaurantId')
  async oauthCallback(
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Query() { code }: HubriseCallbackQueryDto,
  ) {
    await this.hubriseService.connect(restaurantId, code);
    return { connected: true };
  }
}
