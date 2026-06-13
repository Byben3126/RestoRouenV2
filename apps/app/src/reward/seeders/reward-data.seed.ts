import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { RewardFactory } from './reward.factory';

export class RewardDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const restaurantIds: string[] = context.restaurantIds as string[];

    for (const restaurantId of restaurantIds) {
      const restaurant = em.getReference(Restaurant, restaurantId);
      const count = Math.floor(Math.random() * 3) + 2; // 2 à 4 rewards par restaurant

      await new RewardFactory(em).create(count, { restaurant });
    }
  }
}
