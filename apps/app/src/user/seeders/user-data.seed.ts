import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { User } from '@app/auth/entities/user.entity';

import { PersonFactory } from './person.factory';
import { UserProfileFactory } from './user-profile.factory';

export class UserDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const userIds: string[] = context.userIds as string[];
    const restaurantOwnerIds: string[] = [];

    for (const userId of userIds) {
      const user = em.getReference(User, userId);

      await new PersonFactory(em).createOne({ user });
      const profile = await new UserProfileFactory(em).createOne({ user });

      if (profile.isRestaurantOwner) {
        restaurantOwnerIds.push(userId);
      }
    }

    context.restaurantOwnerIds = restaurantOwnerIds;
  }
}
