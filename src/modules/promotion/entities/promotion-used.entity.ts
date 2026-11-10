import { Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { Exclude } from 'class-transformer';
import { randomUUID } from 'crypto';

import { Customer } from '../../customer/entities/customer.entity';
import { Promotion } from './promotion.entity';

@Entity()
// Une promotion ne s'utilise qu'une fois par client, même si le même token est scanné deux fois en parallèle
@Unique({ properties: ['customer', 'promotion'] })
export class PromotionUsed {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Customer)
  customer!: Customer;

  @Exclude()
  @ManyToOne(() => Promotion)
  promotion!: Promotion;

  @Property({ onCreate: () => new Date() })
  usedAt?: Date = new Date();
}
