import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import {
  ApiCreatedWrappedResponse,
  ApiOkWrappedResponse,
} from '../common/decorators/api-response.decorator';
import { CurrentRestaurant } from '../common/decorators/current-restaurant.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RestaurantOwnerGuard } from '../common/guards/restaurant-owner.guard';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { PromotionDto } from './dto/promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { UsePromotionDto } from './dto/use-promotion.dto';
import { PromotionService } from './promotion.service';

/** Gestion des promotions par le propriétaire du restaurant connecté */
@ApiTags('Promotions')
@UseGuards(AuthGuard, RestaurantOwnerGuard)
@Controller('promotions')
export class OwnerPromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get()
  @Serialize(PromotionDto, ['owner'])
  @ApiOkWrappedResponse({ type: PromotionDto, isArray: true })
  async getRestaurantPromotions(@CurrentRestaurant() restaurantId: string) {
    return this.promotionService.getRestaurantPromotions(restaurantId);
  }

  @Post()
  @Serialize(PromotionDto, ['owner'])
  @ApiCreatedWrappedResponse({ type: PromotionDto })
  createPromotion(@CurrentRestaurant() restaurantId: string, @Body() dto: CreatePromotionDto) {
    return this.promotionService.createPromotion(restaurantId, dto);
  }

  @Patch(':id')
  @Serialize(PromotionDto, ['owner'])
  @ApiOkWrappedResponse({ type: PromotionDto })
  updatePromotion(
    @CurrentRestaurant() restaurantId: string,
    @Param('id') promotionId: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionService.updatePromotion(restaurantId, promotionId, dto);
  }

  @Patch(':id/archive')
  @Serialize(PromotionDto, ['owner'])
  @ApiOkWrappedResponse({ type: PromotionDto })
  archivePromotion(@CurrentRestaurant() restaurantId: string, @Param('id') promotionId: string) {
    return this.promotionService.archivePromotion(restaurantId, promotionId);
  }

  @Patch(':id/draft')
  @Serialize(PromotionDto, ['owner'])
  @ApiOkWrappedResponse({ type: PromotionDto })
  draftPromotion(@CurrentRestaurant() restaurantId: string, @Param('id') promotionId: string) {
    return this.promotionService.draftPromotion(restaurantId, promotionId);
  }

  @Patch(':id/publish')
  @Serialize(PromotionDto, ['owner'])
  @ApiOkWrappedResponse({ type: PromotionDto })
  publishPromotion(@CurrentRestaurant() restaurantId: string, @Param('id') promotionId: string) {
    return this.promotionService.publishPromotion(restaurantId, promotionId);
  }

  /** Scan du QR code du client : vérifie son token et marque la promotion comme utilisée */
  @Post('use')
  @HttpCode(200)
  @Serialize(PromotionDto)
  @ApiOkWrappedResponse({ type: PromotionDto })
  usePromotion(@CurrentRestaurant() restaurantId: string, @Body() dto: UsePromotionDto) {
    return this.promotionService.usePromotion(restaurantId, dto.token);
  }
}
