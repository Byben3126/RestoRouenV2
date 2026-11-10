import { EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { User } from '../../../modules/auth/entities/user.entity';
import { AccountFactory } from '../../../modules/auth/seeders/account.factory';
import { UserFactory } from '../../../modules/auth/seeders/user.factory';
import { Language } from '../../../modules/user/entities/app-user.entity';
import { AppUserFactory } from '../../../modules/user/seeders/app-user.factory';
import { PersonFactory } from '../../../modules/user/seeders/person.factory';

/** Comptes de l'équipe : le rôle donne accès à /admin (AdminJS) ou à /dev/queues (Bull Board) */
export const STAFF_USERS = [
  { email: 'admin@restorouen.test', firstName: 'Admin', role: 'admin' },
  { email: 'dev@restorouen.test', firstName: 'Dev', role: 'dev' },
];

/**
 * Comptes de l'équipe, mot de passe SEED_PASSWORD. Recréés s'ils existent.
 * Seul : npx mikro-orm seeder:run --class=StaffUsersSeeder
 */
export class StaffUsersSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // Le reste (AppUser, Person, compte, sessions) suit par cascade depuis le User
    await em.nativeDelete(User, { email: { $in: STAFF_USERS.map((staff) => staff.email) } });

    for (const { email, firstName, role } of STAFF_USERS) {
      const user = await new UserFactory(em).createOne({
        name: `${firstName} Test`,
        email,
        emailVerified: true,
        role,
      });
      await new AccountFactory(em).createOne({ accountId: user.id, user });
      const appUser = await new AppUserFactory(em).createOne({
        authUser: user,
        language: Language.FRENCH,
        isRestaurantOwner: false,
      });
      await new PersonFactory(em).createOne({ user: appUser, firstName, lastName: 'Test' });
    }
  }
}
