import {
  Entity,
  EntityRepositoryType,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { AppUser } from '../../user/entities/app-user.entity';
import { CustomerRepository } from '../repositories/customer.repository';

@Entity({ repository: () => CustomerRepository })
@Index({ properties: ['user', 'restaurant'], options: { unique: true } })
export class Customer {
  [EntityRepositoryType]?: CustomerRepository;
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => AppUser)
  user!: AppUser;

  @ManyToOne(() => Restaurant)
  restaurant!: Restaurant;

  @Property()
  points: number = 0;

  @Property()
  totalPointsGained: number = 0;

  @Property()
  canSubmitRating: boolean = false;

  @Property({ nullable: true, type: 'date' })
  lastVisitDate?: Date;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  get isInactive(): boolean {
    if (!this.lastVisitDate) return true;
    const days = Number(process.env.INACTIVE_THRESHOLD_DAYS ?? 30);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);
    return this.lastVisitDate < threshold;
  }

  static inactiveThreshold(): Date {
    const days = Number(process.env.INACTIVE_THRESHOLD_DAYS ?? 30);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }
}
