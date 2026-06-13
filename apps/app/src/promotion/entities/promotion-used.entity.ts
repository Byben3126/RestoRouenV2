import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Customer } from '../../customer/entities/customer.entity';
import { Promotion } from './promotion.entity';

@Entity()
export class PromotionUsed {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Customer)
  customer!: Customer;

  @ManyToOne(() => Promotion)
  promotion!: Promotion;

  @Property({ onCreate: () => new Date() })
  usedAt?: Date = new Date();
}
