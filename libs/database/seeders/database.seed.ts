import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { CustomerDataSeeder } from '../../../apps/app/src/customer/seeders/customer-data.seed';
import { RestaurantDataSeeder } from '../../../apps/app/src/restaurant/seeders/restaurant-data.seed';
import { UserDataSeeder } from '../../../apps/app/src/user/seeders/user-data.seed';
import { UserSeeder } from '../../../apps/auth/src/seeders/user.seed';

export class DatabaseSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    return this.call(em, [UserSeeder, UserDataSeeder, RestaurantDataSeeder, CustomerDataSeeder]);
  }
}
