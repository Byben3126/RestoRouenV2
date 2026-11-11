import {
  Collection,
  Entity,
  EntityRepositoryType,
  OneToMany,
  OneToOne,
  PrimaryKey,
  Property,
} from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import type { Customer } from '../../customer/entities/customer.entity';
import type { Media } from '../../media/entities/media.entity';
import { AppUser } from '../../user/entities/app-user.entity';
import { RestaurantRepository } from '../repositories/restaurant.repository';
import { Outlet } from './outlet.entity';

@Entity({ repository: () => RestaurantRepository })
export class Restaurant {
  [EntityRepositoryType]?: RestaurantRepository;
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @OneToOne(() => AppUser)
  user!: AppUser;

  @Property()
  name!: string;

  /** Du plus ancien au plus récent : le premier est l'établissement principal (celui géré par l'app mobile) */
  @OneToMany(() => Outlet, (outlet) => outlet.restaurant, { orderBy: { createdAt: 'asc' } })
  outlets = new Collection<Outlet>(this);

  @Property({ type: 'json', nullable: true })
  mediaIds: string[] = [];

  medias?: Media[];

  /**
   * Carte de fidélité de l'utilisateur connecté, null s'il n'en a pas.
   * Non stockée et non chargée par défaut : voir RestaurantRepository.loadLoyaltyForMany.
   */
  loyalty?: Customer | null;

  @Property({ type: 'double' })
  averageRating: number = 0;

  @Property()
  reviewCount: number = 0;

  @Property()
  isActive: boolean = true;

  @Property({ nullable: true, unique: true })
  cloudwaitressId?: string;

  @Property({ nullable: true })
  cloudwaitressUrl?: string;

  @Property({ nullable: true })
  cloudwaitressWebhookAuthSecret?: string;

  @Property({ nullable: true })
  hubriseAccessToken?: string;

  @Property({ nullable: true })
  hubriseLocationId?: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
