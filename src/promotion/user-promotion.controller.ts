import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { GetUserPromotionsQueryDto } from './dto/get-user-promotions-query.dto';
import { PaginatedUserPromotionsDto } from './dto/promotion.dto';
import { PromotionService } from './promotion.service';

/** Promotions disponibles pour l'utilisateur connecté, tous restaurants confondus */
@ApiTags('Promotions')
@UseGuards(AuthGuard)
@Controller('users/me/promotions')
export class UserPromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  /** Promotions pour tous (non ciblées) */
  @Get()
  @Serialize(PaginatedUserPromotionsDto)
  @ApiOkResponse({ type: PaginatedUserPromotionsDto })
  getUntargetedPromotions(
    @CurrentUser() userId: string,
    @Query() query: GetUserPromotionsQueryDto,
  ) {
    return this.promotionService.getUntargetedPromotions(userId, query);
  }

  /** Promotions qui ciblent l'utilisateur (TARGETED ou INACTIVE) */
  @Get('targeted')
  @Serialize(PaginatedUserPromotionsDto)
  @ApiOkResponse({ type: PaginatedUserPromotionsDto })
  getTargetedPromotions(@CurrentUser() userId: string, @Query() query: GetUserPromotionsQueryDto) {
    return this.promotionService.getTargetedPromotions(userId, query);
  }
}
