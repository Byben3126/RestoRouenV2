import { Entity, EntityRepositoryType, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Outlet } from '../../restaurant/entities/outlet.entity';
import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { AppUser } from '../../user/entities/app-user.entity';
import { OrderRepository } from '../repositories/order.repository';

/** Commande reçue de HubRise, mise à jour à chaque événement */
// « order » est un mot réservé en SQL
@Entity({ tableName: 'hubrise_order', repository: () => OrderRepository })
export class Order {
  [EntityRepositoryType]?: OrderRepository;

  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ unique: true })
  hubriseOrderId!: string;

  /** Référence donnée par la solution de commande (numéro de ticket…), si elle en fournit une */
  @Property({ nullable: true })
  ref?: string;

  @ManyToOne(() => Restaurant)
  restaurant!: Restaurant;

  /** null si l'établissement est supprimé : la commande reste au restaurant */
  @ManyToOne(() => Outlet, { nullable: true, deleteRule: 'set null' })
  outlet?: Outlet;

  /** Statut HubRise (new, accepted, completed, cancelled…), gardé en texte pour ne refuser aucun statut */
  @Property()
  status!: string;

  /** En centimes : HubRise envoie le total en texte, « 50.60 EUR » */
  @Property()
  total!: number;

  @Property()
  currency!: string;

  @Property()
  points!: number;

  /** null tant que personne n'a récupéré les points */
  @ManyToOne(() => AppUser, { nullable: true })
  user?: AppUser;

  @Property({ nullable: true })
  claimedAt?: Date;

  @Property()
  orderedAt!: Date;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
