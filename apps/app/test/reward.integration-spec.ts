import { INestApplication } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import {
  createTestApp,
  seedBaseFixtures,
  cleanBaseFixtures,
} from './helpers/app.helper';
import { Reward, RewardStatus } from '../src/reward/entities/reward.entity';

describe('RewardController (integration)', () => {
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
      await request(app.getHttpServer())
        .post('/rewards')
        .send({ pointRequired: 100 })
        .expect(400);
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
