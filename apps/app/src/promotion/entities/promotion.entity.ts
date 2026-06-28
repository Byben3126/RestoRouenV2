import {
  Collection,
  Entity,
  EntityRepositoryType,
  Enum,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { Formula } from '@mikro-orm/core';
import { Exclude, Expose } from 'class-transformer';
import { randomUUID } from 'crypto';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { PromotionRepository } from '../repositories/promotion.repository';
import { PromotionTarget } from './promotion-target.entity';
import { PromotionUsed } from './promotion-used.entity';

export enum PromotionAudience {
  ALL = 'all',
  INACTIVE = 'inactive',
  TARGETED = 'targeted',
}

export enum PromotionInternalStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

export enum PromotionStatus {
  ACTIVE = 'active',
  UPCOMING = 'upcoming',
  EXPIRED = 'expired',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

@Entity({ repository: () => PromotionRepository })
export class Promotion {
  [EntityRepositoryType]?: PromotionRepository;

  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Restaurant)
  restaurant!: Restaurant;

  @Property()
  name!: string;

  @Enum(() => PromotionAudience)
  audience: PromotionAudience = PromotionAudience.ALL;

  @Enum(() => PromotionInternalStatus)
  internalStatus: PromotionInternalStatus = PromotionInternalStatus.ACTIVE;

  @Property({ nullable: true })
  scheduledAt?: Date;

  @Property({ nullable: true })
  expiresAt?: Date;

  @OneToMany(() => PromotionTarget, (pt) => pt.promotion)
  targetedCustomers = new Collection<PromotionTarget>(this);

  @OneToMany(() => PromotionUsed, (pu) => pu.promotion)
  usages = new Collection<PromotionUsed>(this);

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Formula(
    (alias) => `(select count(*)::int from promotion_used pu where pu.promotion_id = ${alias}.id)`,
    { lazy: true },
  )
  usedCount?: number;

  @Formula(
    (alias) =>
      `(select count(*)::int from promotion_target pt where pt.promotion_id = ${alias}.id)`,
    { lazy: true },
  )
  targetCount?: number;

  get status(): PromotionStatus {
    if (this.internalStatus === PromotionInternalStatus.DRAFT) return PromotionStatus.DRAFT;
    if (this.internalStatus === PromotionInternalStatus.ARCHIVED) return PromotionStatus.ARCHIVED;
    const now = new Date();
    if (this.expiresAt && this.expiresAt <= now) return PromotionStatus.EXPIRED;
    if (this.scheduledAt && this.scheduledAt > now) return PromotionStatus.UPCOMING;
    return PromotionStatus.ACTIVE;
  }
}
