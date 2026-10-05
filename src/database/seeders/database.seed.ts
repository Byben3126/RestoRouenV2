import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { UserSeeder } from '../../auth/seeders/user.seed';
import { CustomerDataSeeder } from '../../customer/seeders/customer-data.seed';
import { PromotionDataSeeder } from '../../promotion/seeders/promotion-data.seed';
import { RestaurantDataSeeder } from '../../restaurant/seeders/restaurant-data.seed';
import { RewardDataSeeder } from '../../reward/seeders/reward-data.seed';
import { UserDataSeeder } from '../../user/seeders/user-data.seed';

export class DatabaseSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    return this.call(em, [
      UserSeeder,
      UserDataSeeder,
      RestaurantDataSeeder,
      CustomerDataSeeder,
      RewardDataSeeder,
      PromotionDataSeeder,
    ]);
  }
}
