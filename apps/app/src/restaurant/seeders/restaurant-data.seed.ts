import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { User } from '@app/auth/entities/user.entity';

import { RestaurantFactory } from './restaurant.factory';

export class RestaurantDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const restaurantOwnerIds: string[] = context.restaurantOwnerIds as string[];
    const restaurantIds: string[] = [];

    for (const userId of restaurantOwnerIds) {
      const user = em.getReference(User, userId);
      const restaurant = await new RestaurantFactory(em).createOne({ user });
      restaurantIds.push(restaurant.id);
    }

    context.restaurantIds = restaurantIds;
  }
}
