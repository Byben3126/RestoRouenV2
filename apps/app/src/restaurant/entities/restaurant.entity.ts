import { Entity, EntityRepositoryType, OneToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import type { Media } from '../../../../media/src/media/entities/media.entity';
import { AppUser } from '../../user/entities/app-user.entity';
import { RestaurantRepository } from '../repositories/restaurant.repository';

@Entity({ repository: () => RestaurantRepository })
export class Restaurant {
  [EntityRepositoryType]?: RestaurantRepository;
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @OneToOne(() => AppUser)
  user!: AppUser;

  @Property()
  name!: string;

  @Property({ nullable: true, type: 'double' })
  latitude?: number;

  @Property({ nullable: true, type: 'double' })
  longitude?: number;

  @Property({ nullable: true })
  country?: string;

  @Property({ nullable: true })
  city?: string;

  @Property({ nullable: true })
  formattedAddress?: string;

  @Property({ nullable: true })
  placeId?: string;

  @Property({ nullable: true })
  googleMyBusinessLink?: string;

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
