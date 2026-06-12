import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { AccountFactory } from './account.factory';
import { UserFactory } from './user.factory';

export class UserSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const users = await new UserFactory(em).create(10);

    for (const user of users) {
      await new AccountFactory(em).createOne({
        accountId: user.id,
        user,
      });
    }

    context.userIds = users.map((user) => user.id);
  }
}
