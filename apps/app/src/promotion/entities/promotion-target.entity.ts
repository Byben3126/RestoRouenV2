import { Entity, Index, ManyToOne, PrimaryKey } from '@mikro-orm/core';
import { Exclude } from 'class-transformer';
import { randomUUID } from 'crypto';

import { Customer } from '../../customer/entities/customer.entity';
import { Promotion } from './promotion.entity';

@Entity()
@Index({ properties: ['customer', 'promotion'], options: { unique: true } })
export class PromotionTarget {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Exclude()
  @ManyToOne(() => Customer)
  customer!: Customer;

  @Exclude()
  @ManyToOne(() => Promotion)
  promotion!: Promotion;
}
