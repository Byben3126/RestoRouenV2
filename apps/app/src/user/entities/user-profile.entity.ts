import { Entity, Enum, OneToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { randomBytes, randomUUID } from 'crypto';

import { User } from '@app/auth/entities/user.entity';

export enum Language {
  FRENCH = 'fr',
  ENGLISH = 'en',
  SPANISH = 'es',
}

@Entity()
export class UserProfile {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @OneToOne(() => User)
  user!: User;

  @Enum({ items: () => Language })
  language: Language = Language.FRENCH;

  @Property({ unique: true })
  linkCode: string = randomBytes(4).toString('hex').toUpperCase();

  @Property()
  isActive: boolean = true;

  @Property()
  isRestaurantOwner: boolean = false;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  deactivate(): void {
    this.isActive = false;
  }

  activate(): void {
    this.isActive = true;
  }
}
