import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';
import { randomBytes } from 'crypto';

export enum Language {
  FRENCH = 'fr',
  ENGLISH = 'en',
  SPANISH = 'es',
}

@Entity()
export class UserProfile {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ unique: true })
  userId!: string;

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
