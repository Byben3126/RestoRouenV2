import { faker } from '@faker-js/faker';
import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { AppUser } from '../../user/entities/app-user.entity';
import { CustomerFactory } from './customer.factory';

export class CustomerDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const appUserIds: string[] = context.appUserIds as string[];
    const restaurantIds: string[] = context.restaurantIds as string[];

    for (const restaurantId of restaurantIds) {
      const restaurant = em.getReference(Restaurant, restaurantId);
      const selectedAppUserIds = faker.helpers.arrayElements(appUserIds, {
        min: Math.floor(appUserIds.length * 0.4),
        max: Math.floor(appUserIds.length * 0.8),
      });

      for (const appUserId of selectedAppUserIds) {
        const user = em.getReference(AppUser, appUserId);
        await new CustomerFactory(em).createOne({ user, restaurant });
      }

      await em.flush();
    }
  }
}
