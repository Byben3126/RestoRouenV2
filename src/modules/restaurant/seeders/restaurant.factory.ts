import { faker } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';

import { Restaurant } from '../entities/restaurant.entity';

export class RestaurantFactory extends Factory<Restaurant> {
  model = Restaurant;

  definition(): Partial<Restaurant> {
    return {
      name: faker.company.name(),
      averageRating: parseFloat(
        faker.number.float({ min: 0, max: 5, fractionDigits: 1 }).toFixed(1),
      ),
      reviewCount: faker.number.int({ min: 0, max: 500 }),
      isActive: true,
    };
  }
}
