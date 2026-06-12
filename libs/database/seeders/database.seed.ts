import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { UserDataSeeder } from '../../../apps/app/src/user/seeders/user-data.seed';
import { UserSeeder } from '../../../apps/auth/src/seeders/user.seed';

export class DatabaseSeeder extends Seeder {
  run(em: EntityManager): Promise<void> {
    return this.call(em, [UserSeeder, UserDataSeeder]);
  }
}
