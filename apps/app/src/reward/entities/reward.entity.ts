import {
  Collection,
  Entity,
  EntityRepositoryType,
  Enum,
  Formula,
  ManyToMany,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Media } from '../../../../media/src/media/entities/media.entity';
import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { RewardRepository } from '../repositories/reward.repository';

export enum RewardStatus {
  ACTIVE = 'active',
  DRAFT = 'draft',
  ARCHIVED = 'archived',
}

@Entity({ repository: () => RewardRepository })
export class Reward {
  [EntityRepositoryType]?: RewardRepository;

  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Restaurant)
  restaurant!: Restaurant;

  @Property()
  name!: string;

  @Property()
  pointRequired!: number;

  @Property({ nullable: true })
  description?: string;

  @ManyToMany(() => Media)
  medias = new Collection<Media>(this);

  @Enum(() => RewardStatus)
  status: RewardStatus = RewardStatus.ACTIVE;

  @Formula(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    (alias) => `(select count(*)::int from reward_used ru where ru.reward_id = ${alias}.id)`,
    { lazy: true },
  )
  usedCount?: number;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  get mediaIds(): string[] {
    return this.medias.isInitialized() ? this.medias.getItems().map((m) => m.id) : [];
  }
}
