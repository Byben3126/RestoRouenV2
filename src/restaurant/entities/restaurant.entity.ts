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

  @OneToMany(() => Outlet, (outlet) => outlet.restaurant)
  outlets = new Collection<Outlet>(this);

  @Property({ type: 'json', nullable: true })
  mediaIds: string[] = [];

  medias?: Media[];

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

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
