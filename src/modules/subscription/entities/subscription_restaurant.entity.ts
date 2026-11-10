import {
  Entity,
  EntityRepositoryType,
  Enum,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { SubscriptionRepository } from '../repositories/subscription.repository';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
  CANCELED = 'canceled',
  PAUSED = 'paused',
}

export enum SubscriptionPlan {
  STARTER = 'starter',
  GROWTH = 'growth',
  PRO = 'pro',
}

@Entity({ repository: () => SubscriptionRepository })
export class Subscription {
  [EntityRepositoryType]?: SubscriptionRepository;

  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Restaurant)
  restaurant!: Restaurant;

  @Property({ nullable: true, unique: true })
  stripeSubscriptionId?: string;

  @Enum(() => SubscriptionPlan)
  plan!: SubscriptionPlan;

  @Enum(() => SubscriptionStatus)
  status: SubscriptionStatus = SubscriptionStatus.INCOMPLETE;

  @Property()
  cancelAtPeriodEnd: boolean = false;

  @Property({ nullable: true })
  currentPeriodEnd?: Date;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
