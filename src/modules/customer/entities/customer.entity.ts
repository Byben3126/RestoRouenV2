import {
  Collection,
  Entity,
  EntityRepositoryType,
  Formula,
  Index,
  ManyToOne,
  ObjectQuery,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { Reward } from '../../reward/entities/reward.entity';
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

  /** true après une visite, jusqu'à ce que le client la note */
  @Property()
  canSubmitRating: boolean = false;

  @Property({ nullable: true, type: 'date' })
  lastVisitDate?: Date;

  /** false : le client a coupé toutes les notifications de ce restaurant */
  @Property()
  notificationsEnabled: boolean = true;

  @OneToMany(() => PointsTransaction, (t) => t.customer)
  pointsTransactions = new Collection<PointsTransaction>(this);

  /** Récompenses actives que les points permettent déjà d'obtenir */
  @Formula(
    ({ alias }) => `(select count(*)::int from reward r
      where r.restaurant_id = ${alias}.restaurant_id and r.status = 'active'
        and r.point_required <= ${alias}.points)`,
    { lazy: true },
  )
  availableRewardCount?: number;

  /** Récompense active la moins chère que les points ne permettent pas encore d'obtenir */
  @ManyToOne(() => Reward, {
    formula: ({ alias }) => `(select r.id from reward r
      where r.restaurant_id = ${alias}.restaurant_id and r.status = 'active'
        and r.point_required > ${alias}.points
      order by r.point_required, r.id limit 1)`,
    persist: false,
    nullable: true,
    lazy: true,
  })
  nextReward?: Reward;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  /** Jamais venu, ou pas de visite depuis INACTIVE_THRESHOLD_DAYS jours (30 par défaut) */
  get isInactive(): boolean {
    return !this.lastVisitDate || this.lastVisitDate < Customer.inactiveThreshold();
  }

  static inactiveThreshold(): Date {
    const days = Number(process.env.INACTIVE_THRESHOLD_DAYS ?? 30);
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }

  /** La règle de isInactive, en filtre de requête : les deux se modifient ensemble */
  static inactiveFilter(): ObjectQuery<Customer> {
    return {
      $or: [{ lastVisitDate: null }, { lastVisitDate: { $lt: Customer.inactiveThreshold() } }],
    };
  }

  hasEnoughPoints(amount: number): boolean {
    return this.points >= amount;
  }

  /** Crédite des points. Compte comme une visite ; la transaction est enregistrée au prochain flush. */
  addPoints(amount: number, reason?: string): PointsTransaction {
    const transaction = this.recordTransaction(PointsTransactionType.GAIN, amount, reason);
    this.points += amount;
    this.totalPointsGained += amount;
    return transaction;
  }

  /** Débite des points. Compte comme une visite ; la transaction est enregistrée au prochain flush. */
  removePoints(amount: number, reason?: string): PointsTransaction {
    if (!this.hasEnoughPoints(amount)) throw new Error('Not enough points');
    const transaction = this.recordTransaction(PointsTransactionType.LOSS, amount, reason);
    this.points -= amount;
    return transaction;
  }

  /** Une visite au restaurant (points, récompense ou promotion) : le client peut la noter */
  recordVisit(): void {
    this.lastVisitDate = new Date();
    this.canSubmitRating = true;
  }

  private recordTransaction(
    type: PointsTransactionType,
    amount: number,
    reason?: string,
  ): PointsTransaction {
    // Créée avant de mettre à jour la date de visite (calcul de reactivatedCustomer)
    const transaction = new PointsTransaction({ customer: this, type, amount, reason });
    this.pointsTransactions.add(transaction);
    this.recordVisit();
    return transaction;
  }
}
