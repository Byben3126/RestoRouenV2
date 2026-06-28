import { Entity, EntityRepositoryType, Enum, Formula, OneToOne, Property } from '@mikro-orm/core';
import { randomBytes } from 'crypto';

import { User } from '@app/auth/entities/user.entity';

import { AppUserRepository } from '../repositories/app-user.repository';
import { Person } from './person.entity';

export enum Language {
  FRENCH = 'fr',
  ENGLISH = 'en',
  SPANISH = 'es',
}

@Entity({ repository: () => AppUserRepository })
export class AppUser {
  [EntityRepositoryType]?: AppUserRepository;

  @OneToOne(() => User, { primary: true, fieldName: 'id' })
  authUser!: User;

  get id(): string {
    return this.authUser.id;
  }

  @OneToOne(() => Person, (p) => p.user, { nullable: true })
  person?: Person;

  @Enum(() => Language)
  language: Language = Language.FRENCH;

  @Property({ unique: true })
  linkCode: string = randomBytes(4).toString('hex').toUpperCase();

  @Property()
  isActive: boolean = true;

  @Formula(
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    (alias) => `(select count(*)::int > 0 from restaurant r where r.user_id = ${alias}.id)`,
    { lazy: false },
  )
  isRestaurantOwner!: boolean;

  @Property({ nullable: true, unique: true })
  stripeCustomerId?: string;

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
