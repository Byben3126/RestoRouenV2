import { Entity, EntityRepositoryType, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { createHash, randomBytes, randomUUID } from 'crypto';

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

  @Property({ nullable: true })
  hubriseAccessToken?: string;

  @Property({ nullable: true })
  hubriseLocationId?: string;

  /** Hash du token de la tablette face au client ; le token n'est connu que de la tablette */
  @Property({ nullable: true, unique: true, hidden: true })
  tabletTokenHash?: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  /** Ses commandes HubRise sont reçues */
  get isHubriseConnected(): boolean {
    return !!this.hubriseLocationId;
  }

  /** Un token a été généré pour sa tablette face au client */
  get hasTabletToken(): boolean {
    return !!this.tabletTokenHash;
  }

  /** Nouveau token de la tablette : le précédent ne permet plus de se connecter */
  generateTabletToken(): string {
    const token = randomBytes(32).toString('base64url');
    this.tabletTokenHash = Outlet.hashTabletToken(token);
    return token;
  }

  static hashTabletToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
