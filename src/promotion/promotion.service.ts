import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';

import { CreatePromotionDto } from './dto/create-promotion.dto';
import { GetUserPromotionsQueryDto } from './dto/get-user-promotions-query.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { Promotion, PromotionInternalStatus } from './entities/promotion.entity';
import { PromotionRepository } from './repositories/promotion.repository';

/** Contenu du token d'utilisation d'une promotion : l'utilisateur (sub) et la promotion demandée */
interface PromotionTokenPayload {
  sub: string;
  promotionId: string;
}

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepository: PromotionRepository,
    private readonly jwtService: JwtService,
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
    const { items, total } = await this.promotionRepository.findAllForUser(userId, page, limit);
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

  /** Signe la demande de l'utilisateur d'utiliser la promotion, si elle lui est disponible */
  async createPromotionToken(userId: string, promotionId: string) {
    const promotion = await this.promotionRepository.findAvailableByIdForUser(promotionId, userId);
    if (!promotion) throw new NotFoundException('Promotion not available');

    const payload: PromotionTokenPayload = { sub: userId, promotionId: promotion.id };
    const token = await this.jwtService.signAsync(payload);
    const { exp } = this.jwtService.decode<{ exp: number }>(token);
    return { token, expiresAt: new Date(exp * 1000) };
  }

  /** Le restaurant scanne le token du client : la promotion est marquée utilisée pour ce client */
  async usePromotion(restaurantId: string, token: string): Promise<Promotion> {
    let payload: PromotionTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<PromotionTokenPayload>(token);
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }

    const promotion = await this.promotionRepository.findAvailableByIdForUser(
      payload.promotionId,
      payload.sub,
    );
    // Utilisée, expirée ou désactivée depuis la génération du token
    if (!promotion) throw new ConflictException('Promotion not available');
    if (promotion.restaurant.id !== restaurantId) {
      throw new ForbiddenException('Promotion belongs to another restaurant');
    }

    try {
      await this.promotionRepository.markUsedByUser(promotion, payload.sub);
    } catch (error) {
      // Même token scanné deux fois en même temps
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictException('Promotion not available');
      }
      throw error;
    }
    return promotion;
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
