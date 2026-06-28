import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { User } from '@app/auth/entities/user.entity';

import { AppUserFactory } from './app-user.factory';
import { PersonFactory } from './person.factory';

export class UserDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const userIds: string[] = context.userIds as string[];
    const restaurantOwnerIds: string[] = [];
    const appUserIds: string[] = [];

    for (const userId of userIds) {
      const authUser = em.getReference(User, userId);
      const appUser = await new AppUserFactory(em).createOne({ authUser });
      await new PersonFactory(em).createOne({ user: appUser });

      appUserIds.push(appUser.authUser.id);
      if (appUser.isRestaurantOwner) {
        restaurantOwnerIds.push(appUser.authUser.id);
      }
    }

    context.appUserIds = appUserIds;
    context.restaurantOwnerIds = restaurantOwnerIds;
  }
}
