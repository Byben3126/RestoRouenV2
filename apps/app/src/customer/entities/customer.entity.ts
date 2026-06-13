import { Entity, Index, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

@Entity()
@Index({ properties: ['userId', 'restaurantId'], options: { unique: true } })
export class Customer {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property()
  userId!: string;

  @Property()
  restaurantId!: string;

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
}
