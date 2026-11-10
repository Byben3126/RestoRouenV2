import { Entity, Enum, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Customer } from './customer.entity';

export enum PointsTransactionType {
  GAIN = 'gain',
  LOSS = 'loss',
}

@Entity()
export class PointsTransaction {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Customer)
  customer!: Customer;

  @Property()
  amount!: number;

  @Enum(() => PointsTransactionType)
  type!: PointsTransactionType;

  @Property({ nullable: true })
  reason?: string;

  @Property()
  reactivatedCustomer: boolean = false;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  constructor(data: Pick<PointsTransaction, 'customer' | 'type' | 'amount' | 'reason'>) {
    Object.assign(this, data);
    // Le client était-il inactif avant cette visite ? À créer avant de mettre à jour lastVisitDate
    this.reactivatedCustomer = data.customer.isInactive;
  }
}
