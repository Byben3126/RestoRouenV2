import { faker } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';

import { Restaurant } from '../entities/restaurant.entity';

export class RestaurantFactory extends Factory<Restaurant> {
  model = Restaurant;

  definition(): Partial<Restaurant> {
    return {
      name: faker.company.name(),
      latitude: parseFloat(faker.location.latitude().toString()),
      longitude: parseFloat(faker.location.longitude().toString()),
      country: faker.location.country(),
      city: faker.location.city(),
      formattedAddress: faker.location.streetAddress({ useFullAddress: true }),
      averageRating: parseFloat(faker.number.float({ min: 0, max: 5, fractionDigits: 1 }).toFixed(1)),
      reviewCount: faker.number.int({ min: 0, max: 500 }),
      isActive: true,
    };
  }
}
