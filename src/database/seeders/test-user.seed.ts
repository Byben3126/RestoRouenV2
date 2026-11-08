import { EntityManager, RequiredEntityData } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { User } from '../../auth/entities/user.entity';
import { AccountFactory } from '../../auth/seeders/account.factory';
import { UserFactory } from '../../auth/seeders/user.factory';
import { Customer } from '../../customer/entities/customer.entity';
import {
  PointsTransaction,
  PointsTransactionType,
} from '../../customer/entities/points-transaction.entity';
import { createPointsTransaction } from '../../customer/seeders/points-transaction.factory';
import { Notification } from '../../notification/entities/notification.entity';
import { pointsAddedMessage } from '../../notification/messages';
import { PromotionTarget } from '../../promotion/entities/promotion-target.entity';
import { PromotionUsed } from '../../promotion/entities/promotion-used.entity';
import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { RewardUsed } from '../../reward/entities/reward-used.entity';
import { Reward, RewardStatus } from '../../reward/entities/reward.entity';
import { Language } from '../../user/entities/app-user.entity';
import { AppUserFactory } from '../../user/seeders/app-user.factory';
import { PersonFactory } from '../../user/seeders/person.factory';

export const TEST_USER_EMAIL = 'client@restorouen.test';

const INACTIVE_DAYS = Number(process.env.INACTIVE_THRESHOLD_DAYS ?? 30);

/** Une carte par restaurant, chacune dans un état différent ; visits en jours, de la plus ancienne */
const CARDS: { visits: number[]; points: (thresholds: number[]) => number; useReward?: boolean }[] =
  [
    // Habitué : deux récompenses débloquées, la première déjà utilisée lors de la dernière visite
    { visits: [60, 45, 30, 20, 9, 2], points: ([, second]) => second + 10, useReward: true },
    // Presque une récompense
    { visits: [20, 12, 5], points: ([first]) => first - 10 },
    // Toutes les récompenses débloquées
    { visits: [80, 50, 25, 12], points: (thresholds) => thresholds[thresholds.length - 1] + 20 },
    // Inactif depuis 45 jours
    { visits: [100, 70, 45], points: ([first]) => Math.floor(first / 2) },
    // Première visite hier
    { visits: [1], points: () => 15 },
  ];

/**
 * Compte client de test, mot de passe SEED_PASSWORD, avec des cartes, un historique de points et
 * les notifications correspondantes, dans des restaurants déjà en base.
 * Recrée le compte s'il existe : les dates repartent d'aujourd'hui.
 * Seul : npx mikro-orm seeder:run --class=TestUserSeeder
 */
export class TestUserSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const existing = await em.findOne(User, { email: TEST_USER_EMAIL });
    if (existing) await deleteTestUser(em, existing.id);

    const user = await new UserFactory(em).createOne({
      name: 'Client Test',
      email: TEST_USER_EMAIL,
      emailVerified: true,
    });
    await new AccountFactory(em).createOne({ accountId: user.id, user });
    const appUser = await new AppUserFactory(em).createOne({
      authUser: user,
      language: Language.FRENCH,
      isRestaurantOwner: false,
    });
    await new PersonFactory(em).createOne({ user: appUser, firstName: 'Client', lastName: 'Test' });

    const rewards = await em.find(
      Reward,
      { status: RewardStatus.ACTIVE, restaurant: { isActive: true } },
      { populate: ['restaurant'], orderBy: { pointRequired: 'ASC' } },
    );
    const rewardsByRestaurant = new Map<Restaurant, Reward[]>();
    for (const reward of rewards) {
      rewardsByRestaurant.set(reward.restaurant, [
        ...(rewardsByRestaurant.get(reward.restaurant) ?? []),
        reward,
      ]);
    }
    const restaurants = [...rewardsByRestaurant]
      .filter(([, restaurantRewards]) => restaurantRewards.length >= 2)
      .sort(([a], [b]) => a.name.localeCompare(b.name))
      .slice(0, CARDS.length);

    restaurants.forEach(([restaurant, restaurantRewards], i) => {
      const card = CARDS[i];
      const points = card.points(restaurantRewards.map((r) => r.pointRequired));
      const usedReward = card.useReward ? restaurantRewards[0] : undefined;
      const gained = points + (usedReward?.pointRequired ?? 0);
      const dates = card.visits.map(daysAgo);

      const customer = em.create(Customer, {
        user: appUser,
        restaurant,
        points,
        totalPointsGained: gained,
        lastVisitDate: dates[dates.length - 1],
        canSubmitRating: true,
      } as any);

      const share = Math.floor(gained / dates.length);
      let balance = 0;
      dates.forEach((date, v) => {
        const amount = v === dates.length - 1 ? gained - share * v : share;
        balance += amount;
        createPointsTransaction(em, customer, {
          type: PointsTransactionType.GAIN,
          amount,
          createdAt: date,
          reactivatedCustomer: v === 0 || card.visits[v - 1] - card.visits[v] > INACTIVE_DAYS,
        });
        em.create(Notification, {
          user: appUser,
          restaurant,
          ...pointsAddedMessage(amount, balance, restaurant),
          createdAt: date,
          // Celles des 3 derniers jours restent non lues : la pastille de la cloche s'affiche
          readAt: card.visits[v] > 3 ? date : undefined,
        } as RequiredEntityData<Notification>);
      });

      if (usedReward) {
        const usedAt = dates[dates.length - 1];
        createPointsTransaction(em, customer, {
          type: PointsTransactionType.LOSS,
          amount: usedReward.pointRequired,
          createdAt: new Date(usedAt.getTime() + 60 * 1000),
          reason: `Récompense : ${usedReward.name}`,
        });
        em.create(RewardUsed, { customer, reward: usedReward, usedAt });
      }
    });

    await em.flush();
  }
}

/** Ce qui dépend des cartes, puis les cartes ; le reste suit par cascade depuis le User */
async function deleteTestUser(em: EntityManager, userId: string): Promise<void> {
  const ofCards = { customer: { user: userId } };
  await em.nativeDelete(PointsTransaction, ofCards);
  await em.nativeDelete(RewardUsed, ofCards);
  await em.nativeDelete(PromotionUsed, ofCards);
  await em.nativeDelete(PromotionTarget, ofCards);
  await em.nativeDelete(Customer, { user: userId });
  await em.nativeDelete(User, { id: userId });
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}
