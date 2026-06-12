import { faker } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';

import { Gender, Person } from '../entities/person.entity';

export class PersonFactory extends Factory<Person> {
  model = Person;

  definition(): Partial<Person> {
    return {
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      dateOfBirth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
      gender: faker.helpers.enumValue(Gender),
      city: faker.location.city(),
      country: faker.location.country(),
    };
  }
}
