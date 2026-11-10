import { faker } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';

import { Customer } from '../entities/customer.entity';

export class CustomerFactory extends Factory<Customer> {
  model = Customer;

  definition(): Partial<Customer> {
    return {
      points: faker.number.int({ min: 0, max: 1000 }),
      totalPointsGained: faker.number.int({ min: 0, max: 5000 }),
      canSubmitRating: faker.datatype.boolean({ probability: 0.5 }),
      lastVisitDate: faker.date.recent({ days: 90 }),
    };
  }
}
