import { faker } from '@faker-js/faker';
import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { Customer } from '../../customer/entities/customer.entity';
import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { RewardUsed } from '../entities/reward-used.entity';
import { RewardFactory } from './reward.factory';

export class RewardDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const restaurantIds: string[] = context.restaurantIds as string[];

    for (const restaurantId of restaurantIds) {
      const restaurant = em.getReference(Restaurant, restaurantId);
      const customers = await em.find(Customer, { restaurant });
      const rewards = await new RewardFactory(em).create(faker.number.int({ min: 2, max: 4 }), {
        restaurant,
      });

      for (const reward of rewards) {
        const used = faker.helpers.arrayElements(customers, {
          min: 0,
          max: Math.ceil(customers.length / 2),
        });

        for (const customer of used) {
          em.create(RewardUsed, { customer, reward });
        }
      }

      await em.flush();
    }
  }
}
