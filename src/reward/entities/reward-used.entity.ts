import { Entity, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Customer } from '../../customer/entities/customer.entity';
import { Reward } from './reward.entity';

@Entity()
export class RewardUsed {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Customer)
  customer!: Customer;

  @ManyToOne(() => Reward)
  reward!: Reward;

  /** Id (jti) du token scanné : un même token ne peut servir qu'une fois */
  @Property({ type: 'uuid', nullable: true, unique: true })
  tokenId?: string;

  @Property({ onCreate: () => new Date() })
  usedAt?: Date = new Date();
}
