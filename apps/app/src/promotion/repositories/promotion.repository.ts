import { EntityRepository, RequiredEntityData } from '@mikro-orm/postgresql';

import { CreatePromotionDto } from '../dto/create-promotion.dto';
import { UpdatePromotionDto } from '../dto/update-promotion.dto';
import { PromotionTarget } from '../entities/promotion-target.entity';
import {
  Promotion,
  PromotionAudience,
  PromotionInternalStatus,
} from '../entities/promotion.entity';

const PROMOTION_DETAIL_POPULATE = [
  'usedCount',
  'targetCount',
  'targetedCustomers',
  'targetedCustomers.customer',
  'targetedCustomers.customer.user',
  'targetedCustomers.customer.user.authUser',
  'targetedCustomers.customer.user.person',
] as const;

export class PromotionRepository extends EntityRepository<Promotion> {
  async findByRestaurant(restaurantId: string): Promise<Promotion[]> {
    return this.find(
      { restaurant: restaurantId },
      {
        populate: PROMOTION_DETAIL_POPULATE,
        orderBy: { createdAt: 'DESC' },
      },
    );
  }

  async createForRestaurant(restaurantId: string, dto: CreatePromotionDto): Promise<Promotion> {
    return this.em.transactional(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { status, customerIds: _customerIds, ...rest } = dto;
      const promotion = this.create({
        ...rest,
        restaurant: restaurantId,
        internalStatus: status,
      } as RequiredEntityData<Promotion>);

      if (dto.audience === PromotionAudience.TARGETED) {
        await this.setTargets(promotion, dto.customerIds ?? []);
      }

      await this.em.flush();
      return promotion;
    });
  }

  async updateForRestaurant(
    restaurantId: string,
    promotionId: string,
    dto: UpdatePromotionDto,
  ): Promise<Promotion | null> {
    return this.em.transactional(async () => {
      const promotion = await this.findOne({ id: promotionId, restaurant: restaurantId });
      if (!promotion) return null;

      //si on quitte TARGETED alors on supprime les targets
      if (
        dto.audience &&
        dto.audience !== PromotionAudience.TARGETED &&
        promotion.audience === PromotionAudience.TARGETED
      ) {
        await this.setTargets(promotion, []);
      }

      this.em.assign(promotion, dto);

      //si on est sur TARGETED avec de nouveaux clients
      if (dto.customerIds && promotion.audience === PromotionAudience.TARGETED) {
        await this.setTargets(promotion, dto.customerIds);
      }

      await this.em.flush();
      await this.em.populate(promotion, [...PROMOTION_DETAIL_POPULATE]);
      return promotion;
    });
  }

  private async setTargets(promotion: Promotion, customerIds: string[]): Promise<void> {
    await this.em.nativeDelete(PromotionTarget, { promotion: promotion.id });
    for (const customerId of customerIds) {
      this.em.create(PromotionTarget, {
        promotion,
        customer: customerId,
      } as RequiredEntityData<PromotionTarget>);
    }
  }

  async setStatusForRestaurant(
    restaurantId: string,
    promotionId: string,
    status: PromotionInternalStatus,
  ): Promise<Promotion | null> {
    const affected = await this.nativeUpdate(
      { id: promotionId, restaurant: restaurantId },
      { internalStatus: status },
    );
    if (!affected) return null;
    return this.findOne({ id: promotionId }, { populate: PROMOTION_DETAIL_POPULATE });
  }
}
