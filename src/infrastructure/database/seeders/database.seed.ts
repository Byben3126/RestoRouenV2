import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { UserSeeder } from '../../../modules/auth/seeders/user.seed';
import { CustomerDataSeeder } from '../../../modules/customer/seeders/customer-data.seed';
import { PromotionDataSeeder } from '../../../modules/promotion/seeders/promotion-data.seed';
import { RestaurantDataSeeder } from '../../../modules/restaurant/seeders/restaurant-data.seed';
import { RewardDataSeeder } from '../../../modules/reward/seeders/reward-data.seed';
import { UserDataSeeder } from '../../../modules/user/seeders/user-data.seed';
import { StaffUsersSeeder } from './staff-users.seed';
import { TestUserSeeder } from './test-user.seed';

export class DatabaseSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    return this.call(em, [
      UserSeeder,
      UserDataSeeder,
      RestaurantDataSeeder,
      CustomerDataSeeder,
      RewardDataSeeder,
      PromotionDataSeeder,
      TestUserSeeder,
      StaffUsersSeeder,
    ]);
  }
}
