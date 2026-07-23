import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Customer } from './customer.entity';

@Entity()
export class PointsTransaction {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Customer)
  customer!: Customer;

  @Property()
  amount!: number;

  @Property({ nullable: true })
  reason?: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
