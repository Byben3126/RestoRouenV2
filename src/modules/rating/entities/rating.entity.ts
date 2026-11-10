import { Entity, EntityRepositoryType, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { Customer } from '../../customer/entities/customer.entity';
import { RatingRepository } from '../repositories/rating.repository';

/** Note donnée par un client après une visite */
@Entity({ repository: () => RatingRepository })
export class Rating {
  [EntityRepositoryType]?: RatingRepository;
  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @ManyToOne(() => Customer)
  customer!: Customer;

  /** De 1 à 5 */
  @Property({ type: 'smallint' })
  globalRating!: number;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
