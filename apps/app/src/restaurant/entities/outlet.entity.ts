import { Entity, EntityRepositoryType, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { OutletRepository } from '../repositories/outlet.repository';
import { Restaurant } from './restaurant.entity';

@Entity({ repository: () => OutletRepository })
export class Outlet {
  [EntityRepositoryType]?: OutletRepository;

  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Restaurant)
  restaurant!: Restaurant;

  @Property()
  name!: string;

  @Property({ nullable: true, type: 'double' })
  latitude?: number;

  @Property({ nullable: true, type: 'double' })
  longitude?: number;

  @Property({ nullable: true })
  formattedAddress?: string;

  @Property({ nullable: true })
  placeId?: string;

  @Property({ nullable: true })
  googleMyBusinessLink?: string;

  @Property()
  isActive: boolean = true;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
