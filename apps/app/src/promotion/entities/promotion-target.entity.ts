import { Entity, Index, ManyToOne, PrimaryKey } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Customer } from '../../customer/entities/customer.entity';
import { Promotion } from './promotion.entity';

@Entity()
@Index({ properties: ['customer', 'promotion'], options: { unique: true } })
export class PromotionTarget {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Customer)
  customer!: Customer;

  @ManyToOne(() => Promotion)
  promotion!: Promotion;
}
