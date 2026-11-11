import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { HubriseSignatureGuard } from '../../common/guards/hubrise-signature.guard';
import { HubriseCallbackQueryDto, type HubriseEvent } from './dto/hubrise.dto';
import { HubriseService } from './hubrise.service';

@ApiTags('HubRise')
@AllowAnonymous()
@Controller('hubrize')
export class HubriseController {
  private readonly logger = new Logger(HubriseController.name);

  constructor(private readonly hubriseService: HubriseService) {}

  /** HubRise y renvoie le navigateur une fois l'accès autorisé depuis la fiche établissement de l'admin */
  @Get('oauth/callback/:outletId')
  async oauthCallback(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Query() { code }: HubriseCallbackQueryDto,
  ) {
    await this.hubriseService.connect(outletId, code);
    return { connected: true };
  }

  /** HubRise y envoie les commandes de l'établissement connecté par connect() */
  @Post('order/:outletId')
  @UseGuards(HubriseSignatureGuard)
  @HttpCode(200)
  receiveOrderEvent(
    @Param('outletId', ParseUUIDPipe) outletId: string,
    @Body() event: HubriseEvent,
  ) {
    this.logger.log(
      `${event.resource_type}.${event.event_type} ${event.order_id} pour l'établissement ${outletId}`,
    );
    return { received: true };
  }
}
