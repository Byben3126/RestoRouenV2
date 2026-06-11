import { Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';

import { User } from './user.entity';

@Entity({ tableName: 'account' })
export class Account {
  @PrimaryKey()
  id!: string;

  @Property()
  accountId!: string;

  @Property()
  providerId!: string;

  @Index()
  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Property({ nullable: true })
  accessToken?: string;

  @Property({ nullable: true })
  refreshToken?: string;

  @Property({ nullable: true })
  idToken?: string;

  @Property({ nullable: true })
  accessTokenExpiresAt?: Date;

  @Property({ nullable: true })
  refreshTokenExpiresAt?: Date;

  @Property({ nullable: true })
  scope?: string;

  @Property({ nullable: true })
  password?: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
