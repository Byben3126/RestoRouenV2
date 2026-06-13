import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { User } from '@app/auth/entities/user.entity';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { CustomerFactory } from './customer.factory';

export class CustomerDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const userIds: string[] = context.userIds as string[];
    const restaurantIds: string[] = context.restaurantIds as string[];

    for (const restaurantId of restaurantIds) {
      const restaurant = em.getReference(Restaurant, restaurantId);
      const shuffled = [...userIds].sort(() => Math.random() - 0.5);
      const count = faker_count(userIds.length);
      const selectedUserIds = shuffled.slice(0, count);

      for (const userId of selectedUserIds) {
        const user = em.getReference(User, userId);
        await new CustomerFactory(em).createOne({ user, restaurant });
      }
    }
  }
}

function faker_count(max: number): number {
  return Math.floor(Math.random() * Math.min(6, max)) + 3;
}
