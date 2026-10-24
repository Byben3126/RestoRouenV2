import {
  Entity,
  EntityRepositoryType,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { AppUser } from '../../user/entities/app-user.entity';
import type { PushMessage } from '../push-notification.service';
import { NotificationRepository } from '../repositories/notification.repository';

/**
 * Notification du centre de notifications : le même message que le push.
 * Enregistrée même quand l'utilisateur a coupé le push de cette catégorie ou de ce restaurant.
 */
@Entity({ repository: () => NotificationRepository })
@Index({ properties: ['user', 'createdAt'] })
export class Notification {
  [EntityRepositoryType]?: NotificationRepository;

  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => AppUser, { deleteRule: 'cascade' })
  user!: AppUser;

  /** null : notification de l'app, hors restaurant */
  @ManyToOne(() => Restaurant, { nullable: true, deleteRule: 'cascade' })
  restaurant?: Restaurant;

  @Property({ type: 'json' })
  headings!: PushMessage['headings'];

  @Property({ type: 'json' })
  contents!: PushMessage['contents'];

  /** type (ex. points.added) et identifiants utiles à l'app pour la navigation */
  @Property({ type: 'json', nullable: true })
  data?: object;

  /** null tant que l'utilisateur ne l'a pas lue */
  @Property({ nullable: true })
  readAt?: Date;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
