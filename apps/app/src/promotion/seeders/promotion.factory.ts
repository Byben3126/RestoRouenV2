import { faker } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';

import { Promotion } from '../entities/promotion.entity';

const PROMOTION_NAMES = [
  'Happy Hour -20%',
  'Menu du jour offert',
  'Dessert gratuit pour 2 plats',
  'Boisson offerte avec un menu',
  "2 cafés pour le prix d'1",
  'Réduction anniversaire',
  'Offre fidélité -15%',
];

export class PromotionFactory extends Factory<Promotion> {
  model = Promotion;

  definition(): Partial<Promotion> {
    return {
      name: faker.helpers.arrayElement(PROMOTION_NAMES),
      forEveryone: faker.datatype.boolean({ probability: 0.6 }),
      expiresAt: faker.datatype.boolean({ probability: 0.7 })
        ? faker.date.future({ years: 1 })
        : undefined,
    };
  }
}
