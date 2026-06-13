import { faker } from '@faker-js/faker';
import { Factory } from '@mikro-orm/seeder';

import { Reward } from '../entities/reward.entity';

const REWARD_NAMES = [
  'Café offert',
  'Dessert gratuit',
  'Réduction 10%',
  'Entrée offerte',
  'Menu à -20%',
  'Boisson offerte',
  'Livraison gratuite',
];

export class RewardFactory extends Factory<Reward> {
  model = Reward;

  definition(): Partial<Reward> {
    return {
      name: faker.helpers.arrayElement(REWARD_NAMES),
      pointRequired: faker.number.int({ min: 50, max: 500 }),
    };
  }
}
