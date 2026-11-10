import { faker } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';

import { Promotion, PromotionAudience } from '../entities/promotion.entity';

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
      audience: faker.helpers.arrayElement(Object.values(PromotionAudience)),
      scheduledAt: faker.datatype.boolean({ probability: 0.3 })
        ? faker.date.soon({ days: 30 })
        : undefined,
      expiresAt: faker.datatype.boolean({ probability: 0.7 })
        ? faker.date.future({ years: 1 })
        : undefined,
    };
  }
}
