import { Collection, Entity, OneToMany, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { Exclude } from 'class-transformer';

import { Account } from './account.entity';
import { Session } from './session.entity';

@Entity({ tableName: 'user' })
export class User {
  @PrimaryKey()
  id!: string;

  @Property()
  name!: string;

  @Unique()
  @Property()
  email!: string;

  @Property({ default: false })
  emailVerified: boolean = false;

  @Property({ nullable: true })
  image?: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Exclude()
  @OneToMany(() => Session, (session) => session.user)
  sessions = new Collection<Session>(this);

  @Exclude()
  @OneToMany(() => Account, (account) => account.user)
  accounts = new Collection<Account>(this);
}
