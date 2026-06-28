import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Serialize } from '@main/common/decorators/serialize.decorator';

import { CurrentRestaurant } from '../common/decorators/current-restaurant.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RestaurantOwnerGuard } from '../common/guards/restaurant-owner.guard';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { PromotionDto } from './dto/promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionService } from './promotion.service';

@ApiTags('Promotions')
@UseGuards(AuthGuard, RestaurantOwnerGuard)
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  @Get()
  @Serialize(PromotionDto, ['owner'])
  @ApiOkResponse({ type: PromotionDto, isArray: true })
  async getRestaurantPromotions(@CurrentRestaurant() restaurantId: string) {
    return this.promotionService.getRestaurantPromotions(restaurantId);
  }

  @Post()
  @Serialize(PromotionDto, ['owner'])
  @ApiCreatedResponse({ type: PromotionDto })
  createPromotion(@CurrentRestaurant() restaurantId: string, @Body() dto: CreatePromotionDto) {
    return this.promotionService.createPromotion(restaurantId, dto);
  }

  @Patch(':id')
  @Serialize(PromotionDto, ['owner'])
  @ApiOkResponse({ type: PromotionDto })
  updatePromotion(
    @CurrentRestaurant() restaurantId: string,
    @Param('id') promotionId: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionService.updatePromotion(restaurantId, promotionId, dto);
  }

  @Patch(':id/archive')
  @Serialize(PromotionDto, ['owner'])
  @ApiOkResponse({ type: PromotionDto })
  archivePromotion(@CurrentRestaurant() restaurantId: string, @Param('id') promotionId: string) {
    return this.promotionService.archivePromotion(restaurantId, promotionId);
  }

  @Patch(':id/draft')
  @Serialize(PromotionDto, ['owner'])
  @ApiOkResponse({ type: PromotionDto })
  draftPromotion(@CurrentRestaurant() restaurantId: string, @Param('id') promotionId: string) {
    return this.promotionService.draftPromotion(restaurantId, promotionId);
  }

  @Patch(':id/publish')
  @Serialize(PromotionDto, ['owner'])
  @ApiOkResponse({ type: PromotionDto })
  publishPromotion(@CurrentRestaurant() restaurantId: string, @Param('id') promotionId: string) {
    return this.promotionService.publishPromotion(restaurantId, promotionId);
  }
}
