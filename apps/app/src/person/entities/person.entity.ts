import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

@Entity()
export class Person {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ unique: true })
  userId!: string;

  @Property()
  firstName!: string;

  @Property({ nullable: true })
  lastName?: string;

  @Property({ nullable: true, type: 'date' })
  dateOfBirth?: Date;

  @Enum({ items: () => Gender, nullable: true })
  gender?: Gender;

  @Property({ nullable: true })
  city?: string;

  @Property({ nullable: true })
  country?: string;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  getFullName(): string {
    return this.lastName ? `${this.firstName} ${this.lastName}` : this.firstName;
  }
}
