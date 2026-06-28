import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

export class RestaurantDataSeeder extends Seeder {
  run(_em: EntityManager, context: Dictionary): void {
    const restaurantIds: string[] = [];

    // for (const appUserId of restaurantOwnerIds) {
    //   const user = em.getReference(AppUser, appUserId);
    //   const restaurant = await new RestaurantFactory(em).createOne({ user });
    //   restaurantIds.push(restaurant.id);
    // }

    context.restaurantIds = restaurantIds;
  }
}
