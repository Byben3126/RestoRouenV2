import {
  Collection,
  Entity,
  EntityRepositoryType,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { AppUser } from '../../user/entities/app-user.entity';
import { CustomerRepository } from '../repositories/customer.repository';
import { PointsTransaction, PointsTransactionType } from './points-transaction.entity';

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

  @OneToMany(() => PointsTransaction, (t) => t.customer)
  pointsTransactions = new Collection<PointsTransaction>(this);

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

  hasEnoughPoints(amount: number): boolean {
    return this.points >= amount;
  }

  /** Crédite des points. Compte comme une visite ; la transaction est enregistrée au prochain flush. */
  addPoints(amount: number, reason?: string): PointsTransaction {
    const transaction = this.recordVisit(PointsTransactionType.GAIN, amount, reason);
    this.points += amount;
    this.totalPointsGained += amount;
    return transaction;
  }

  /** Débite des points. Compte comme une visite ; la transaction est enregistrée au prochain flush. */
  removePoints(amount: number, reason?: string): PointsTransaction {
    if (!this.hasEnoughPoints(amount)) throw new Error('Not enough points');
    const transaction = this.recordVisit(PointsTransactionType.LOSS, amount, reason);
    this.points -= amount;
    return transaction;
  }

  private recordVisit(
    type: PointsTransactionType,
    amount: number,
    reason?: string,
  ): PointsTransaction {
    const transaction = new PointsTransaction();
    transaction.customer = this;
    transaction.type = type;
    transaction.amount = amount;
    transaction.reason = reason;
    // A calculer avant de mettre à jour la date de visite
    transaction.reactivatedCustomer = this.isInactive;
    this.pointsTransactions.add(transaction);

    this.lastVisitDate = new Date();
    return transaction;
  }
}
