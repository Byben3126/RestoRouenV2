import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiOkWrappedResponse } from '../common/decorators/api-response.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { PromotionDto } from './dto/promotion.dto';
import { PromotionService } from './promotion.service';

/** Promotions d'un restaurant vues par un client (pas réservé au propriétaire) */
@ApiTags('Promotions')
@UseGuards(AuthGuard)
@Controller('restaurant/:restaurantId/promotions')
export class RestaurantPromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get()
  @Serialize(PromotionDto)
  @ApiOkWrappedResponse({ type: PromotionDto, isArray: true })
  getAvailablePromotions(
    @CurrentUser() userId: string,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
  ) {
    return this.promotionService.getAvailablePromotions(restaurantId, userId);
  }
}
