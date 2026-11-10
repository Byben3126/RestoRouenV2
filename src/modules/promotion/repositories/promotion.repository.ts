import { EntityRepository, RequiredEntityData } from '@mikro-orm/postgresql';

import { Customer } from '../../customer/entities/customer.entity';
import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { CreatePromotionDto } from '../dto/create-promotion.dto';
import { UpdatePromotionDto } from '../dto/update-promotion.dto';
import { PromotionTarget } from '../entities/promotion-target.entity';
import { PromotionUsed } from '../entities/promotion-used.entity';
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

  /** Promotions en cours visibles par un utilisateur. null si le restaurant n'existe pas ou est désactivé. */
  async findAvailableForUser(restaurantId: string, userId: string): Promise<Promotion[] | null> {
    const restaurantExists = await this.em.count(Restaurant, { id: restaurantId, isActive: true });
    if (!restaurantExists) return null;

    const customer = await this.em.findOne(Customer, { user: userId, restaurant: restaurantId });
    const isInactive = customer?.isInactive ?? false;
    const now = new Date();

    return this.find(
      {
        restaurant: restaurantId,
        internalStatus: PromotionInternalStatus.ACTIVE,
        // Pas déjà utilisée par l'utilisateur
        usages: { $none: { customer: { user: userId } } },
        $and: [
          // Entre scheduledAt et expiresAt (chaque borne est optionnelle)
          { $or: [{ scheduledAt: null }, { scheduledAt: { $lte: now } }] },
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
          {
            $or: [
              { audience: PromotionAudience.ALL },
              {
                audience: PromotionAudience.TARGETED,
                targetedCustomers: { $some: { customer: { user: userId } } },
              },
              ...(isInactive ? [{ audience: PromotionAudience.INACTIVE }] : []),
            ],
          },
        ],
      },
      { orderBy: { createdAt: 'DESC' } },
    );
  }

  /**
   * Toutes les promotions disponibles pour l'utilisateur, tous restaurants confondus : celles pour
   * tous, TARGETED s'il est dans les cibles, INACTIVE dans les restaurants où il est client inactif.
   */
  async findAllForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Promotion[]; total: number }> {
    const inactiveCustomers = await this.em.find(
      Customer,
      {
        user: userId,
        $or: [{ lastVisitDate: null }, { lastVisitDate: { $lt: Customer.inactiveThreshold() } }],
      },
      { fields: ['restaurant'] },
    );
    const inactiveRestaurantIds = inactiveCustomers.map((c) => c.restaurant.id);
    const now = new Date();

    const [items, total] = await this.findAndCount(
      {
        restaurant: { isActive: true },
        internalStatus: PromotionInternalStatus.ACTIVE,
        // Pas déjà utilisée par l'utilisateur
        usages: { $none: { customer: { user: userId } } },
        $and: [
          // Entre scheduledAt et expiresAt (chaque borne est optionnelle)
          { $or: [{ scheduledAt: null }, { scheduledAt: { $lte: now } }] },
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
          {
            $or: [
              { audience: PromotionAudience.ALL },
              {
                audience: PromotionAudience.TARGETED,
                targetedCustomers: { $some: { customer: { user: userId } } },
              },
              {
                audience: PromotionAudience.INACTIVE,
                restaurant: { $in: inactiveRestaurantIds },
              },
            ],
          },
        ],
      },
      {
        populate: ['restaurant'],
        orderBy: { createdAt: 'DESC' },
        limit,
        offset: (page - 1) * limit,
      },
    );
    return { items, total };
  }

  /**
   * Promotions qui ciblent l'utilisateur, tous restaurants confondus : TARGETED s'il est dans les
   * cibles, INACTIVE dans les restaurants où il est client inactif.
   */
  async findTargetedForUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: Promotion[]; total: number }> {
    const inactiveCustomers = await this.em.find(
      Customer,
      {
        user: userId,
        $or: [{ lastVisitDate: null }, { lastVisitDate: { $lt: Customer.inactiveThreshold() } }],
      },
      { fields: ['restaurant'] },
    );
    const inactiveRestaurantIds = inactiveCustomers.map((c) => c.restaurant.id);
    const now = new Date();

    const [items, total] = await this.findAndCount(
      {
        restaurant: { isActive: true },
        internalStatus: PromotionInternalStatus.ACTIVE,
        // Pas déjà utilisée par l'utilisateur
        usages: { $none: { customer: { user: userId } } },
        $and: [
          // Entre scheduledAt et expiresAt (chaque borne est optionnelle)
          { $or: [{ scheduledAt: null }, { scheduledAt: { $lte: now } }] },
          { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
          {
            $or: [
              {
                audience: PromotionAudience.TARGETED,
                targetedCustomers: { $some: { customer: { user: userId } } },
              },
              {
                audience: PromotionAudience.INACTIVE,
                restaurant: { $in: inactiveRestaurantIds },
              },
            ],
          },
        ],
      },
      {
        populate: ['restaurant'],
        orderBy: { createdAt: 'DESC' },
        limit,
        offset: (page - 1) * limit,
      },
    );
    return { items, total };
  }

  /** La promotion si elle est disponible pour l'utilisateur (mêmes règles que findAllForUser), sinon null */
  async findAvailableByIdForUser(promotionId: string, userId: string): Promise<Promotion | null> {
    const inactiveCustomers = await this.em.find(
      Customer,
      {
        user: userId,
        $or: [{ lastVisitDate: null }, { lastVisitDate: { $lt: Customer.inactiveThreshold() } }],
      },
      { fields: ['restaurant'] },
    );
    const inactiveRestaurantIds = inactiveCustomers.map((c) => c.restaurant.id);
    const now = new Date();

    return this.findOne({
      id: promotionId,
      restaurant: { isActive: true },
      internalStatus: PromotionInternalStatus.ACTIVE,
      // Pas déjà utilisée par l'utilisateur
      usages: { $none: { customer: { user: userId } } },
      $and: [
        // Entre scheduledAt et expiresAt (chaque borne est optionnelle)
        { $or: [{ scheduledAt: null }, { scheduledAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] },
        {
          $or: [
            { audience: PromotionAudience.ALL },
            {
              audience: PromotionAudience.TARGETED,
              targetedCustomers: { $some: { customer: { user: userId } } },
            },
            {
              audience: PromotionAudience.INACTIVE,
              restaurant: { $in: inactiveRestaurantIds },
            },
          ],
        },
      ],
    });
  }

  /**
   * Enregistre l'utilisation de la promotion par l'utilisateur, en le créant client du restaurant si
   * besoin. Utiliser une promotion compte comme une visite.
   */
  async markUsedByUser(promotion: Promotion, userId: string): Promise<void> {
    await this.em.transactional(async (em) => {
      const restaurantId = promotion.restaurant.id;
      const customer =
        (await em.findOne(Customer, { user: userId, restaurant: restaurantId })) ??
        em.create(Customer, {
          user: userId,
          restaurant: restaurantId,
        } as RequiredEntityData<Customer>);
      customer.lastVisitDate = new Date();

      em.create(PromotionUsed, { promotion, customer } as RequiredEntityData<PromotionUsed>);
      await em.flush();
    });
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
