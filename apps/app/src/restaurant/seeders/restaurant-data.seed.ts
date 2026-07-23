import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { AppUser } from '../../user/entities/app-user.entity';
import { RestaurantFactory } from './restaurant.factory';

export class RestaurantDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const restaurantOwnerIds: string[] = context.restaurantOwnerIds as string[];
    const restaurantIds: string[] = [];

    for (const appUserId of restaurantOwnerIds) {
      const user = em.getReference(AppUser, appUserId);
      const restaurant = await new RestaurantFactory(em).createOne({ user });
      restaurantIds.push(restaurant.id);
    }

    context.restaurantIds = restaurantIds;
  }
}
