import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@mikro-orm/nestjs';

import { CreatePromotionDto } from './dto/create-promotion.dto';
import { GetUserPromotionsQueryDto } from './dto/get-user-promotions-query.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion, PromotionInternalStatus } from './entities/promotion.entity';
import { PromotionRepository } from './repositories/promotion.repository';

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: PromotionRepository,
  ) {}

  async getRestaurantPromotions(restaurantId: string): Promise<Promotion[]> {
    return this.promotionRepository.findByRestaurant(restaurantId);
  }

  async getAvailablePromotions(restaurantId: string, userId: string): Promise<Promotion[]> {
    const promotions = await this.promotionRepository.findAvailableForUser(restaurantId, userId);
    if (!promotions) throw new NotFoundException('Restaurant not found');
    return promotions;
  }

  async getAllPromotions(userId: string, { page, limit }: GetUserPromotionsQueryDto) {
    const { items, total } = await this.promotionRepository.findAllForUser(
      userId,
      page,
      limit,
    );
    return { items, total, page, limit };
  }

  async getTargetedPromotions(userId: string, { page, limit }: GetUserPromotionsQueryDto) {
    const { items, total } = await this.promotionRepository.findTargetedForUser(
      userId,
      page,
      limit,
    );
    return { items, total, page, limit };
  }

  createPromotion(restaurantId: string, dto: CreatePromotionDto): Promise<Promotion> {
    return this.promotionRepository.createForRestaurant(restaurantId, dto);
  }

  updatePromotion(
    restaurantId: string,
    promotionId: string,
    dto: UpdatePromotionDto,
  ): Promise<Promotion | null> {
    return this.promotionRepository.updateForRestaurant(restaurantId, promotionId, dto);
  }

  archivePromotion(restaurantId: string, promotionId: string): Promise<Promotion | null> {
    return this.promotionRepository.setStatusForRestaurant(
      restaurantId,
      promotionId,
      PromotionInternalStatus.ARCHIVED,
    );
  }

  draftPromotion(restaurantId: string, promotionId: string): Promise<Promotion | null> {
    return this.promotionRepository.setStatusForRestaurant(
      restaurantId,
      promotionId,
      PromotionInternalStatus.DRAFT,
    );
  }

  publishPromotion(restaurantId: string, promotionId: string): Promise<Promotion | null> {
    return this.promotionRepository.setStatusForRestaurant(
      restaurantId,
      promotionId,
      PromotionInternalStatus.ACTIVE,
    );
  }
}
