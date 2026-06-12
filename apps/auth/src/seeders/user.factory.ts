import { faker } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';
import { randomUUID } from 'crypto';

import { User } from '../entities/user.entity';

export class UserFactory extends Factory<User> {
  model = User;

  definition(): Partial<User> {
    return {
      id: randomUUID(),
      name: faker.person.fullName(),
      email: faker.internet.email().toLowerCase(),
      emailVerified: false,
    };
  }
}
