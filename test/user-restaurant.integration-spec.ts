/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplication } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import { User } from '../src/auth/entities/user.entity';
import { Customer } from '../src/customer/entities/customer.entity';
import {
  PointsTransaction,
  PointsTransactionType,
} from '../src/customer/entities/points-transaction.entity';
import { Outlet } from '../src/restaurant/entities/outlet.entity';
import { Restaurant } from '../src/restaurant/entities/restaurant.entity';
import { Reward, RewardStatus } from '../src/reward/entities/reward.entity';
import { AppUser } from '../src/user/entities/app-user.entity';
import {
  TEST_USER_ID,
  cleanBaseFixtures,
  createTestApp,
  seedBaseFixtures,
} from './helpers/app.helper';

const OWNER_IDS = ['test-loyalty-owner-a', 'test-loyalty-owner-b', 'test-loyalty-owner-c'];

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

// Loin de toute donnée réelle (Géorgie du Sud) ; 0.01° de latitude ≈ 1,1 km
const LAT = -54.28;
const LON = -36.51;

describe('UserRestaurantController (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;
  let restaurantId: string;
  let otherRestaurantId: string;
  let noCardRestaurantId: string;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    em = ctx.em;
    ({ restaurantId } = await seedBaseFixtures(em));

    const fork = em.fork();
    // 0 : avec une carte ; 1 : désactivé ; 2 : sans carte
    const [otherRestaurant, inactiveRestaurant, noCardRestaurant] = OWNER_IDS.map((ownerId, i) => {
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
        isActive: i !== 1,
      } as any);
    });
    otherRestaurantId = otherRestaurant.id;
    noCardRestaurantId = noCardRestaurant.id;
    fork.create(Outlet, {
      restaurant: otherRestaurant,
      name: 'Centre',
      latitude: LAT,
      longitude: LON,
    } as any);
    fork.create(Outlet, {
      restaurant: noCardRestaurant,
      name: 'Centre',
      latitude: LAT + 0.01,
      longitude: LON,
    } as any);

    const card = (restaurant: string, data: object) =>
      fork.create(Customer, {
        user: fork.getReference(AppUser, TEST_USER_ID),
        restaurant,
        ...data,
      } as any);
    card(restaurantId, { points: 30, totalPointsGained: 300, lastVisitDate: daysAgo(10) });
    const otherCard = card(otherRestaurant.id, {
      points: 120,
      totalPointsGained: 150,
      lastVisitDate: daysAgo(1),
    });
    card(inactiveRestaurant.id, { points: 999, totalPointsGained: 999, lastVisitDate: daysAgo(0) });
    // Carte d'un autre client dans le même restaurant : son historique ne doit pas remonter
    const strangerCard = fork.create(Customer, {
      user: fork.getReference(AppUser, OWNER_IDS[2]),
      restaurant: otherRestaurant,
    } as any);

    const transaction = (
      customer: Customer,
      type: PointsTransactionType,
      amount: number,
      days: number,
    ) => {
      const tx = new PointsTransaction({ customer, type, amount, reason: `${type} ${amount}` });
      tx.createdAt = daysAgo(days);
      fork.persist(tx);
    };
    transaction(otherCard, PointsTransactionType.GAIN, 150, 5);
    transaction(otherCard, PointsTransactionType.LOSS, 30, 1);
    transaction(strangerCard, PointsTransactionType.GAIN, 10, 2);

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
    const cardUsers = [TEST_USER_ID, OWNER_IDS[2]];
    await fork.nativeDelete(PointsTransaction, { customer: { user: { $in: cardUsers } } });
    await fork.nativeDelete(Customer, { user: { $in: cardUsers } });
    await fork.nativeDelete(Outlet, { restaurant: { user: { $in: OWNER_IDS } } });
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

  it('adds the card to the search results, null where the user has none', async () => {
    const res = await request(app.getHttpServer()).get('/restaurant/search?q=Other').expect(200);

    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: otherRestaurantId,
          loyalty: expect.objectContaining({ points: 120, availableRewardCount: 2 }),
        }),
        expect.objectContaining({ id: noCardRestaurantId, loyalty: null }),
      ]),
    );
  });

  it('adds the card to the nearby restaurants, null where the user has none', async () => {
    const res = await request(app.getHttpServer())
      .get('/restaurant/nearby')
      .query({ latitude: LAT, longitude: LON, radius: 5 })
      .expect(200);

    expect(res.body.data.items).toEqual([
      expect.objectContaining({
        id: otherRestaurantId,
        loyalty: expect.objectContaining({
          points: 120,
          availableRewardCount: 2,
          nextReward: expect.objectContaining({ pointRequired: 150 }),
        }),
      }),
      expect.objectContaining({ id: noCardRestaurantId, loyalty: null }),
    ]);
  });

  it('adds the card to a single restaurant', async () => {
    const withCard = await request(app.getHttpServer())
      .get(`/restaurant/${otherRestaurantId}`)
      .expect(200);
    expect(withCard.body.data.loyalty).toMatchObject({
      points: 120,
      nextReward: { pointRequired: 150 },
    });

    const withoutCard = await request(app.getHttpServer())
      .get(`/restaurant/${noCardRestaurantId}`)
      .expect(200);
    expect(withoutCard.body.data.loyalty).toBeNull();
  });

  describe('GET /users/me/restaurants/:restaurantId/points-transactions', () => {
    const getHistory = (restaurant: string, query: Record<string, unknown> = {}) =>
      request(app.getHttpServer())
        .get(`/users/me/restaurants/${restaurant}/points-transactions`)
        .query(query);

    it("pages through the user's history, newest first", async () => {
      const first = await getHistory(otherRestaurantId, { limit: 1 }).expect(200);
      expect(first.body.data.items).toMatchObject([
        { type: 'loss', amount: 30, reason: 'loss 30' },
      ]);
      expect(first.body.data.nextCursor).toEqual(expect.any(String));

      const second = await getHistory(otherRestaurantId, {
        limit: 1,
        after: first.body.data.nextCursor,
      }).expect(200);
      // La transaction de l'autre client du restaurant ne remonte pas
      expect(second.body.data).toMatchObject({
        items: [{ type: 'gain', amount: 150, reason: 'gain 150' }],
        nextCursor: null,
      });
    });

    it('returns an empty history where the user has no card', async () => {
      const res = await getHistory(noCardRestaurantId).expect(200);

      expect(res.body.data).toEqual({ items: [], nextCursor: null });
    });

    it('rejects an invalid cursor', async () => {
      await getHistory(otherRestaurantId, { after: 'not-a-cursor' }).expect(400);
    });
  });

  it('rejects an unknown sort', async () => {
    await request(app.getHttpServer()).get('/users/me/restaurants?sortBy=name').expect(400);
  });
});
