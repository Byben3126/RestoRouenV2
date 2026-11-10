import { faker } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';

import { AppUser, Language } from '../entities/app-user.entity';

export class AppUserFactory extends Factory<AppUser> {
  model = AppUser;

  definition(): Partial<AppUser> {
    return {
      language: faker.helpers.enumValue(Language),
      isActive: true,
      isRestaurantOwner: faker.datatype.boolean({ probability: 0.3 }),
    };
  }
}
