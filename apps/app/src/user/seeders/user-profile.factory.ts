import { faker } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';

import { Language, UserProfile } from '../entities/user-profile.entity';

export class UserProfileFactory extends Factory<UserProfile> {
  model = UserProfile;

  definition(): Partial<UserProfile> {
    return {
      language: faker.helpers.enumValue(Language),
      isActive: true,
      isRestaurantOwner: faker.datatype.boolean({ probability: 0.3 }),
    };
  }
}
