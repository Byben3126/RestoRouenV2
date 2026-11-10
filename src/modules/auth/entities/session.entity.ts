import { Entity, Index, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';

import { User } from './user.entity';

@Entity({ tableName: 'session' })
export class Session {
  @PrimaryKey()
  id!: string;

  @Property()
  expiresAt!: Date;

  @Unique()
  @Property()
  token!: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @Property({ nullable: true })
  ipAddress?: string;

  @Property({ nullable: true })
  userAgent?: string;

  @Index()
  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;
}
