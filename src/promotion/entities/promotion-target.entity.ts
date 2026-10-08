import { Entity, ManyToOne, PrimaryKey, Unique } from '@mikro-orm/core';
import { Exclude } from 'class-transformer';
import { randomUUID } from 'crypto';

import { Customer } from '../../customer/entities/customer.entity';
import { Promotion } from './promotion.entity';

@Entity()
@Unique({ properties: ['customer', 'promotion'] })
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
