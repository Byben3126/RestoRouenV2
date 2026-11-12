import {
  Entity,
  EntityRepositoryType,
  Index,
  OneToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { PendingPointsRepository } from '../repositories/pending-points.repository';
import { Order } from './order.entity';

/**
 * Points d'une commande récupérés avec un email sans compte.
 * Supprimés une fois crédités au compte créé avec cet email.
 */
@Entity({ repository: () => PendingPointsRepository })
export class PendingPoints {
  [EntityRepositoryType]?: PendingPointsRepository;

  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  /** En minuscules, comme Better Auth enregistre les emails */
  @Property()
  @Index()
  email!: string;

  /** Le restaurant et les points viennent de la commande */
  @OneToOne(() => Order, { owner: true, deleteRule: 'cascade' })
  order!: Order;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
