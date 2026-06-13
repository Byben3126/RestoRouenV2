import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { RestaurantFactory } from './restaurant.factory';

export class RestaurantDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const restaurantOwnerIds: string[] = context.restaurantOwnerIds as string[];
    const restaurantIds: string[] = [];

    for (const userId of restaurantOwnerIds) {
      const restaurant = await new RestaurantFactory(em).createOne({ userId });
      restaurantIds.push(restaurant.id);
    }

    context.restaurantIds = restaurantIds;
  }
}
