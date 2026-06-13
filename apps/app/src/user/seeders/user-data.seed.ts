import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { PersonFactory } from './person.factory';
import { UserProfileFactory } from './user-profile.factory';

export class UserDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const userIds: string[] = context.userIds as string[];
    const restaurantOwnerIds: string[] = [];

    for (const userId of userIds) {
      await new PersonFactory(em).createOne({ userId });
      const profile = await new UserProfileFactory(em).createOne({ userId });

      if (profile.isRestaurantOwner) {
        restaurantOwnerIds.push(userId);
      }
    }

    context.restaurantOwnerIds = restaurantOwnerIds;
  }
}
