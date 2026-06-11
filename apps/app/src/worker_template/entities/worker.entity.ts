import { Collection, Entity, ManyToMany, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Company } from '../../companies/entities/company.entity';
import { Location } from '../../locations/entities/location.entity';

@Entity()
export class Worker {
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property({ nullable: true })
  userId?: string;

  @Property()
  email!: string;

  @Property({ nullable: true })
  firstName?: string;

  @Property({ nullable: true })
  lastName?: string;

  @ManyToOne(() => Company)
  company!: Company;

  @ManyToMany(() => Location, location => location.workers, { owner: true })
  locations = new Collection<Location>(this);

  @Property()
  isActive: boolean = true;
}
