import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { GetUserPromotionsQueryDto } from './dto/get-user-promotions-query.dto';
import { PromotionTokenDto } from './dto/promotion-token.dto';
import { PaginatedUserPromotionsDto } from './dto/promotion.dto';
import { PromotionService } from './promotion.service';

/** Promotions disponibles pour l'utilisateur connecté, tous restaurants confondus */
@ApiTags('Promotions')
@UseGuards(AuthGuard)
@Controller('users/me/promotions')
export class UserPromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  /** Toutes les promotions disponibles, y compris celles qui ciblent l'utilisateur */
  @Get()
  @Serialize(PaginatedUserPromotionsDto)
  @ApiOkResponse({ type: PaginatedUserPromotionsDto })
  getAllPromotions(@CurrentUser() userId: string, @Query() query: GetUserPromotionsQueryDto) {
    return this.promotionService.getAllPromotions(userId, query);
  }

  /** Promotions qui ciblent l'utilisateur (TARGETED ou INACTIVE) */
  @Get('targeted')
  @Serialize(PaginatedUserPromotionsDto)
  @ApiOkResponse({ type: PaginatedUserPromotionsDto })
  getTargetedPromotions(@CurrentUser() userId: string, @Query() query: GetUserPromotionsQueryDto) {
    return this.promotionService.getTargetedPromotions(userId, query);
  }

  /** Token signé prouvant que l'utilisateur demande à utiliser cette promotion (QR code, 10 min) */
  @Get(':id/token')
  @Serialize(PromotionTokenDto)
  @ApiOkResponse({ type: PromotionTokenDto })
  createPromotionToken(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) promotionId: string,
  ) {
    return this.promotionService.createPromotionToken(userId, promotionId);
  }
}
