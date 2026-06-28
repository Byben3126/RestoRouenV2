import { faker } from '@faker-js/faker';
import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { Customer } from '../../customer/entities/customer.entity';
import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { PromotionTarget } from '../entities/promotion-target.entity';
import { PromotionUsed } from '../entities/promotion-used.entity';
import { PromotionAudience } from '../entities/promotion.entity';
import { PromotionFactory } from './promotion.factory';

export class PromotionDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const restaurantIds: string[] = context.restaurantIds as string[];

    for (const restaurantId of restaurantIds) {
      const restaurant = em.getReference(Restaurant, restaurantId);
      const customers = await em.find(Customer, { restaurant });

      const promotions = await new PromotionFactory(em).create(
        faker.number.int({ min: 1, max: 3 }),
        { restaurant },
      );

      for (const promotion of promotions) {
        const isTargeted = promotion.audience === PromotionAudience.TARGETED;
        const targets = isTargeted
          ? faker.helpers.arrayElements(customers, { min: 1, max: customers.length })
          : customers;

        if (isTargeted) {
          for (const customer of targets) {
            em.create(PromotionTarget, { customer, promotion });
          }
        }

        // Parmi les éligibles, certains ont déjà utilisé la promo
        const used = faker.helpers.arrayElements(targets, {
          min: 0,
          max: Math.ceil(targets.length / 2),
        });

        for (const customer of used) {
          em.create(PromotionUsed, { customer, promotion });
        }
      }

      await em.flush();
    }
  }
}
