/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import { User } from '../src/auth/entities/user.entity';
import { Customer } from '../src/customer/entities/customer.entity';
import {
  PointsTransaction,
  PointsTransactionType,
} from '../src/customer/entities/points-transaction.entity';
import { Restaurant } from '../src/restaurant/entities/restaurant.entity';
import { RewardUsed } from '../src/reward/entities/reward-used.entity';
import { Reward, RewardStatus } from '../src/reward/entities/reward.entity';
import { AppUser } from '../src/user/entities/app-user.entity';
import {
  TEST_USER_ID,
  cleanBaseFixtures,
  createTestApp,
  seedBaseFixtures,
} from './helpers/app.helper';

describe('OwnerRewardController (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;
  let restaurantId: string;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    em = ctx.em;
    ({ restaurantId } = await seedBaseFixtures(em));
  });

  afterAll(async () => {
    await em.fork().nativeDelete(Reward, { restaurant: restaurantId });
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
  });

  afterEach(async () => {
    await em.fork().nativeDelete(Reward, { restaurant: restaurantId });
  });

  // ── GET /rewards ────────────────────────────────────────────────────────────

  describe('GET /rewards', () => {
    it('returns 200 with empty list when no rewards exist', async () => {
      const res = await request(app.getHttpServer()).get('/rewards').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('returns rewards after creation', async () => {
      await request(app.getHttpServer())
        .post('/rewards')
        .send({ name: 'Café offert', pointRequired: 100 });

      const res = await request(app.getHttpServer()).get('/rewards').expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Café offert');
      expect(res.body.data[0].usedCount).toBe(0);
    });
  });

  // ── GET /restaurant/:restaurantId/rewards ───────────────────────────────────

  describe('GET /restaurant/:restaurantId/rewards', () => {
    beforeEach(async () => {
      const fork = em.fork();
      const rewards: [string, number, RewardStatus][] = [
        ['Dessert offert', 200, RewardStatus.ACTIVE],
        ['Café offert', 100, RewardStatus.ACTIVE],
        ['Brouillon', 50, RewardStatus.DRAFT],
        ['Archivée', 10, RewardStatus.ARCHIVED],
      ];
      for (const [name, pointRequired, status] of rewards) {
        fork.create(Reward, { restaurant: restaurantId, name, pointRequired, status } as any);
      }
      await fork.flush();
    });

    it('returns only active rewards, cheapest first, without owner stats', async () => {
      const res = await request(app.getHttpServer())
        .get(`/restaurant/${restaurantId}/rewards`)
        .expect(200);

      const rewards = res.body.data as { name: string; usedCount?: number; medias: unknown[] }[];
      expect(rewards.map((r) => r.name)).toEqual(['Café offert', 'Dessert offert']);
      expect(rewards[0]).not.toHaveProperty('usedCount');
      expect(rewards[0].medias).toEqual([]);
    });

    it('returns 404 when the restaurant is inactive', async () => {
      await em.fork().nativeUpdate(Restaurant, { id: restaurantId }, { isActive: false });
      try {
        await request(app.getHttpServer()).get(`/restaurant/${restaurantId}/rewards`).expect(404);
      } finally {
        await em.fork().nativeUpdate(Restaurant, { id: restaurantId }, { isActive: true });
      }
    });

    it('returns 404 for an unknown restaurant', async () => {
      await request(app.getHttpServer())
        .get('/restaurant/00000000-0000-0000-0000-000000000000/rewards')
        .expect(404);
    });

    it('returns 400 when the restaurant id is not a UUID', async () => {
      await request(app.getHttpServer()).get('/restaurant/abc/rewards').expect(400);
    });
  });

  // ── GET /users/me/rewards/:id/token + POST /rewards/use ─────────────────────

  describe('redeeming a reward with a token', () => {
    const OWNER_B_ID = 'reward-owner-b';
    const DAY = 86_400_000;
    let restaurantBId: string;

    beforeAll(async () => {
      const fork = em.fork();
      const user = fork.create(User, {
        id: OWNER_B_ID,
        name: 'Owner B',
        email: 'reward-owner-b@test.com',
        emailVerified: true,
      } as any);
      const appUser = fork.create(AppUser, { authUser: user } as any);
      const restaurantB = fork.create(Restaurant, { user: appUser, name: 'Restaurant B' } as any);
      await fork.flush();
      restaurantBId = restaurantB.id;
    });

    beforeEach(async () => {
      const fork = em.fork();
      // Client inactif du restaurant A avec 150 points, client du restaurant B avec 100 points
      fork.create(Customer, {
        user: TEST_USER_ID,
        restaurant: restaurantId,
        points: 150,
        totalPointsGained: 150,
        lastVisitDate: new Date(Date.now() - 60 * DAY),
      } as any);
      fork.create(Customer, { user: TEST_USER_ID, restaurant: restaurantBId, points: 100 } as any);
      const rewards: [string, string, number, RewardStatus][] = [
        [restaurantId, 'Café offert', 100, RewardStatus.ACTIVE],
        [restaurantId, 'Dessert offert', 200, RewardStatus.ACTIVE],
        [restaurantId, 'Brouillon', 50, RewardStatus.DRAFT],
        [restaurantBId, 'B café offert', 10, RewardStatus.ACTIVE],
      ];
      for (const [restaurant, name, pointRequired, status] of rewards) {
        fork.create(Reward, { restaurant, name, pointRequired, status } as any);
      }
      await fork.flush();
    });

    afterEach(async () => {
      const fork = em.fork();
      const restaurants = { $in: [restaurantId, restaurantBId] };
      await fork.nativeDelete(RewardUsed, { reward: { restaurant: restaurants } });
      await fork.nativeDelete(PointsTransaction, { customer: { user: TEST_USER_ID } });
      await fork.nativeDelete(Customer, { user: TEST_USER_ID });
      await fork.nativeDelete(Reward, { restaurant: restaurantBId });
    });

    afterAll(async () => {
      const fork = em.fork();
      await fork.nativeDelete(Restaurant, { id: restaurantBId });
      await fork.nativeDelete(AppUser, { authUser: OWNER_B_ID });
      await fork.nativeDelete(User, { id: OWNER_B_ID });
    });

    /** Id de la récompense du test portant ce nom (la base peut en contenir d'autres) */
    const rewardId = async (name: string) => {
      const restaurant = { $in: [restaurantId, restaurantBId] };
      return (await em.fork().findOneOrFail(Reward, { name, restaurant })).id;
    };
    const getToken = async (name: string, status: number) =>
      request(app.getHttpServer())
        .get(`/users/me/rewards/${await rewardId(name)}/token`)
        .expect(status);
    const tokenFor = async (name: string) => (await getToken(name, 200)).body.data.token as string;
    const useReward = (token: string) =>
      request(app.getHttpServer()).post('/rewards/use').send({ token });
    const customerA = () =>
      em.fork().findOneOrFail(Customer, { user: TEST_USER_ID, restaurant: restaurantId });

    it('debits the points, records the usage and the transaction, only once per token', async () => {
      const token = await tokenFor('Café offert');

      const res = await useReward(token).expect(200);

      expect(res.body.data.name).toBe('Café offert');
      expect(res.body.data).not.toHaveProperty('usedCount');
      const customer = await customerA();
      expect(customer.points).toBe(50);
      expect(customer.totalPointsGained).toBe(150);
      // Récupérer une récompense compte comme une visite
      expect(customer.isInactive).toBe(false);
      const transactions = await em.fork().find(PointsTransaction, { customer });
      expect(transactions).toMatchObject([
        {
          type: PointsTransactionType.LOSS,
          amount: 100,
          reason: 'Récompense : Café offert',
          reactivatedCustomer: true,
        },
      ]);
      expect(await em.fork().count(RewardUsed, { customer })).toBe(1);

      // Le même QR code scanné une seconde fois
      await useReward(token).expect(409);
      expect((await customerA()).points).toBe(50);
    });

    it('spends the points only once when two tokens are scanned at the same time', async () => {
      // 150 points : de quoi récupérer un seul café à 100
      const tokens = [await tokenFor('Café offert'), await tokenFor('Café offert')];

      const results = await Promise.all(tokens.map((token) => useReward(token)));

      expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
      expect((await customerA()).points).toBe(50);
      expect(await em.fork().count(RewardUsed, { customer: { user: TEST_USER_ID } })).toBe(1);
    });

    it('returns 409 when the user has no longer enough points at scan time', async () => {
      const token = await tokenFor('Café offert');
      await em.fork().nativeUpdate(
        Customer,
        { user: TEST_USER_ID, restaurant: restaurantId },
        {
          points: 99,
        },
      );

      await useReward(token).expect(409);
      expect(await em.fork().count(RewardUsed, { customer: { user: TEST_USER_ID } })).toBe(0);
    });

    it('returns 403 when the user has not enough points to get a token', async () => {
      await getToken('Dessert offert', 403);
    });

    it('returns 404 for a token on a reward that is not active', async () => {
      await getToken('Brouillon', 404);
    });

    it('returns 403 when the reward belongs to another restaurant', async () => {
      const token = await tokenFor('B café offert');

      await useReward(token).expect(403);
    });

    it('returns 400 when the token is not a valid reward token', async () => {
      // Token de promotion : signé avec un autre secret
      const promotionToken = await new JwtService({ secret: 'another-secret' }).signAsync({
        sub: TEST_USER_ID,
        rewardId: await rewardId('Café offert'),
        jti: '00000000-0000-0000-0000-000000000000',
      });

      await useReward(promotionToken).expect(400);
      await request(app.getHttpServer()).post('/rewards/use').send({}).expect(400);
    });
  });

  // ── POST /rewards ───────────────────────────────────────────────────────────

  describe('POST /rewards', () => {
    it('creates a reward and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/rewards')
        .send({ name: 'Café offert', pointRequired: 100 })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Café offert');
      expect(res.body.data.pointRequired).toBe(100);
      expect(res.body.data.status).toBe(RewardStatus.ACTIVE);
    });

    it('creates a reward with DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .post('/rewards')
        .send({ name: 'Dessert offert', pointRequired: 200, status: 'draft' })
        .expect(201);

      expect(res.body.data.status).toBe(RewardStatus.DRAFT);
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer()).post('/rewards').send({ pointRequired: 100 }).expect(400);
    });

    it('returns 400 when pointRequired is less than 1', async () => {
      await request(app.getHttpServer())
        .post('/rewards')
        .send({ name: 'Test', pointRequired: 0 })
        .expect(400);
    });
  });

  // ── PATCH /rewards/:id ──────────────────────────────────────────────────────

  describe('PATCH /rewards/:id', () => {
    let rewardId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/rewards')
        .send({ name: 'Café offert', pointRequired: 100 });
      rewardId = res.body.data.id;
    });

    it('updates the reward name', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/rewards/${rewardId}`)
        .send({ name: 'Nouveau nom', pointRequired: 100 })
        .expect(200);

      expect(res.body.data.name).toBe('Nouveau nom');
    });

    it('updates the pointRequired', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/rewards/${rewardId}`)
        .send({ name: 'Café offert', pointRequired: 150 })
        .expect(200);

      expect(res.body.data.pointRequired).toBe(150);
    });

    it('returns 404 for unknown reward id', async () => {
      await request(app.getHttpServer())
        .patch('/rewards/00000000-0000-0000-0000-000000000000')
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  // ── PATCH /rewards/:id/archive ──────────────────────────────────────────────

  describe('PATCH /rewards/:id/archive', () => {
    let rewardId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/rewards')
        .send({ name: 'Café offert', pointRequired: 100 });
      rewardId = res.body.data.id;
    });

    it('archives the reward', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/rewards/${rewardId}/archive`)
        .expect(200);

      expect(res.body.data.status).toBe(RewardStatus.ARCHIVED);
    });

    it('returns 404 for unknown reward id', async () => {
      await request(app.getHttpServer())
        .patch('/rewards/00000000-0000-0000-0000-000000000000/archive')
        .expect(404);
    });
  });

  // ── PATCH /rewards/:id/draft ────────────────────────────────────────────────

  describe('PATCH /rewards/:id/draft', () => {
    let rewardId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/rewards')
        .send({ name: 'Café offert', pointRequired: 100, status: 'draft' });
      rewardId = res.body.data.id;
    });

    it('sets reward back to draft', async () => {
      await request(app.getHttpServer()).patch(`/rewards/${rewardId}/archive`);

      const res = await request(app.getHttpServer())
        .patch(`/rewards/${rewardId}/draft`)
        .expect(200);

      expect(res.body.data.status).toBe(RewardStatus.DRAFT);
    });
  });

  // ── PATCH /rewards/:id/publish ──────────────────────────────────────────────

  describe('PATCH /rewards/:id/publish', () => {
    let rewardId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/rewards')
        .send({ name: 'Café offert', pointRequired: 100, status: 'draft' });
      rewardId = res.body.data.id;
    });

    it('publishes the reward', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/rewards/${rewardId}/publish`)
        .expect(200);

      expect(res.body.data.status).toBe(RewardStatus.ACTIVE);
    });
  });
});
