/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplication } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import { User } from '../src/auth/entities/user.entity';
import { Customer } from '../src/customer/entities/customer.entity';
import { Restaurant } from '../src/restaurant/entities/restaurant.entity';
import { Reward, RewardStatus } from '../src/reward/entities/reward.entity';
import { AppUser } from '../src/user/entities/app-user.entity';
import {
  TEST_USER_ID,
  cleanBaseFixtures,
  createTestApp,
  seedBaseFixtures,
} from './helpers/app.helper';

const OWNER_IDS = ['test-loyalty-owner-a', 'test-loyalty-owner-b'];

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

describe('UserRestaurantController (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;
  let restaurantId: string;
  let otherRestaurantId: string;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    em = ctx.em;
    ({ restaurantId } = await seedBaseFixtures(em));

    const fork = em.fork();
    const [otherRestaurant, inactiveRestaurant] = OWNER_IDS.map((ownerId, i) => {
      fork.create(User, {
        id: ownerId,
        name: ownerId,
        email: `${ownerId}@test.com`,
        emailVerified: true,
      } as any);
      const owner = fork.create(AppUser, { authUser: fork.getReference(User, ownerId) } as any);
      return fork.create(Restaurant, {
        user: owner,
        name: `Other Restaurant ${i}`,
        isActive: i === 0,
      } as any);
    });
    otherRestaurantId = otherRestaurant.id;

    const card = (restaurant: string, data: object) =>
      fork.create(Customer, {
        user: fork.getReference(AppUser, TEST_USER_ID),
        restaurant,
        ...data,
      } as any);
    card(restaurantId, { points: 30, totalPointsGained: 300, lastVisitDate: daysAgo(10) });
    card(otherRestaurant.id, { points: 120, totalPointsGained: 150, lastVisitDate: daysAgo(1) });
    card(inactiveRestaurant.id, { points: 999, totalPointsGained: 999, lastVisitDate: daysAgo(0) });

    for (const [pointRequired, status] of [
      [50, RewardStatus.ACTIVE],
      [100, RewardStatus.ACTIVE],
      [130, RewardStatus.DRAFT],
      [150, RewardStatus.ACTIVE],
      [200, RewardStatus.ACTIVE],
    ] as const) {
      fork.create(Reward, {
        restaurant: otherRestaurant,
        name: `${pointRequired} points`,
        pointRequired,
        status,
      } as any);
    }
    await fork.flush();
  });

  afterAll(async () => {
    const fork = em.fork();
    await fork.nativeDelete(Reward, { restaurant: otherRestaurantId });
    await fork.nativeDelete(Customer, { user: TEST_USER_ID });
    await fork.nativeDelete(Restaurant, { user: { $in: OWNER_IDS } });
    await fork.nativeDelete(AppUser, { authUser: { $in: OWNER_IDS } });
    await fork.nativeDelete(User, { id: { $in: OWNER_IDS } });
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
  });

  type UserRestaurants = { items: { name: string }[]; total: number };

  const getRestaurants = async (query = '') => {
    const res = await request(app.getHttpServer()).get(`/users/me/restaurants${query}`).expect(200);
    return res.body.data as UserRestaurants;
  };
  const names = ({ items }: UserRestaurants) => items.map((restaurant) => restaurant.name);

  it('lists the active restaurants where the user has a card, last visited first', async () => {
    const data = await getRestaurants();

    expect(data.total).toBe(2);
    expect(names(data)).toEqual(['Other Restaurant 0', 'Test Restaurant']);
  });

  it('sorts by current points or by points gained over time', async () => {
    expect(names(await getRestaurants('?sortBy=points'))).toEqual([
      'Other Restaurant 0',
      'Test Restaurant',
    ]);
    expect(names(await getRestaurants('?sortBy=totalPointsGained'))).toEqual([
      'Test Restaurant',
      'Other Restaurant 0',
    ]);
  });

  it('gives the next active reward and the number of rewards already reached', async () => {
    const [other, own] = (await getRestaurants()).items;

    expect(other).toMatchObject({
      id: otherRestaurantId,
      medias: [],
      loyalty: {
        points: 120,
        totalPointsGained: 150,
        nextReward: { name: '150 points', pointRequired: 150 },
        availableRewardCount: 2,
      },
    });
    expect(own).toMatchObject({ loyalty: { nextReward: null, availableRewardCount: 0 } });
  });

  it('paginates', async () => {
    const data = await getRestaurants('?limit=1&page=2');

    expect(data).toMatchObject({ total: 2, page: 2, limit: 1 });
    expect(names(data)).toEqual(['Test Restaurant']);
  });

  it('rejects an unknown sort', async () => {
    await request(app.getHttpServer()).get('/users/me/restaurants?sortBy=name').expect(400);
  });
});
