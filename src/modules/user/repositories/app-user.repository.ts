import { EntityData, EntityRepository } from '@mikro-orm/postgresql';

import { Account } from '../../auth/entities/account.entity';
import { Session } from '../../auth/entities/session.entity';
import { User } from '../../auth/entities/user.entity';
import { PointsTransaction } from '../../customer/entities/points-transaction.entity';
import { PromotionUsed } from '../../promotion/entities/promotion-used.entity';
import { AppUser } from '../entities/app-user.entity';
import { Person } from '../entities/person.entity';

export class AppUserRepository extends EntityRepository<AppUser> {
  async findByAuthUserId(authUserId: string): Promise<AppUser | null> {
    return this.findOne({ authUser: authUserId }, { populate: ['authUser', 'person'] });
  }

  async findByLinkCode(linkCode: string): Promise<AppUser | null> {
    return this.findOne({ linkCode }, { populate: ['authUser', 'person'] });
  }

  /** A déjà gagné ou perdu des points, ou utilisé une promotion */
  async hasActivity(userId: string): Promise<boolean> {
    const transactions = await this.em.count(PointsTransaction, { customer: { user: userId } });
    if (transactions > 0) return true;
    const promotionsUsed = await this.em.count(PromotionUsed, { customer: { user: userId } });
    return promotionsUsed > 0;
  }

  /** Nom complet recopié sur le User de Better Auth (emails, admin) */
  async updateProfile(
    appUser: AppUser,
    person: Person,
    appUserData: EntityData<AppUser>,
    personData: EntityData<Person>,
  ): Promise<AppUser> {
    // Les champs non envoyés sont undefined : on les garde tels quels
    this.em.assign(appUser, appUserData, { ignoreUndefined: true });
    this.em.assign(person, personData, { ignoreUndefined: true });

    if (personData.firstName !== undefined || personData.lastName !== undefined) {
      appUser.authUser.name = person.getFullName();
    }

    await this.em.flush();
    return appUser;
  }

  /**
   * Supprime le compte sans casser l'historique des restaurants : AppUser reste (désactivé) avec ses
   * fiches client, mais plus rien ne permet de retrouver la personne ni de se connecter.
   */
  async anonymize(userId: string): Promise<void> {
    await this.em.transactional(async (em) => {
      await em.nativeDelete(Person, { user: userId });
      // Plus de mot de passe ni de compte Google, et déconnecté de tous ses appareils
      await em.nativeDelete(Account, { user: userId });
      await em.nativeDelete(Session, { user: userId });
      // L'email est libéré : la personne pourra se réinscrire
      await em.nativeUpdate(
        User,
        { id: userId },
        {
          email: `deleted-${userId}@deleted.invalid`,
          name: 'Deleted user',
          image: null,
          emailVerified: false,
        },
      );
      await em.nativeUpdate(AppUser, { authUser: userId }, { isActive: false });
    });
  }

  /** AppUser et Person enregistrés ensemble (un seul flush) : l'un ne peut pas exister sans l'autre */
  async createFromAuthUser(payload: {
    userId: string;
    email: string;
    firstName: string;
    lastName?: string;
  }): Promise<boolean> {
    const existing = await this.findOne({ authUser: payload.userId });
    if (existing) return false;

    const authUser = this.em.getReference(User, payload.userId);
    const appUser = this.em.create(AppUser, { authUser } as any);

    const person = new Person();
    person.user = appUser;
    person.firstName = payload.firstName;
    person.lastName = payload.lastName;
    this.em.persist(person);
    await this.em.flush();
    return true;
  }
}
