import { INestApplication } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import {
  Promotion,
  PromotionAudience,
  PromotionInternalStatus,
  PromotionStatus,
} from '../src/promotion/entities/promotion.entity';
import { cleanBaseFixtures, createTestApp, seedBaseFixtures } from './helpers/app.helper';

describe('PromotionController (integration)', () => {
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
    await em.fork().nativeDelete(Promotion, { restaurant: restaurantId });
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
  });

  afterEach(async () => {
    await em.fork().nativeDelete(Promotion, { restaurant: restaurantId });
  });

  const BASE_DTO = { name: 'Happy Hour', audience: PromotionAudience.ALL };

  // ── GET /promotions ─────────────────────────────────────────────────────────

  describe('GET /promotions', () => {
    it('returns 200 with empty list when no promotions exist', async () => {
      const res = await request(app.getHttpServer()).get('/promotions').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('returns promotions after creation', async () => {
      await request(app.getHttpServer()).post('/promotions').send(BASE_DTO);

      const res = await request(app.getHttpServer()).get('/promotions').expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Happy Hour');
    });
  });

  // ── POST /promotions ────────────────────────────────────────────────────────

  describe('POST /promotions', () => {
    it('creates a promotion and returns 201', async () => {
      const res = await request(app.getHttpServer()).post('/promotions').send(BASE_DTO).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Happy Hour');
      expect(res.body.data.audience).toBe(PromotionAudience.ALL);
      expect(res.body.data.status).toBe(PromotionStatus.ACTIVE);
    });

    it('creates a promotion with DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .post('/promotions')
        .send({ ...BASE_DTO, status: PromotionInternalStatus.DRAFT })
        .expect(201);

      expect(res.body.data.status).toBe(PromotionStatus.DRAFT);
    });

    it('creates an INACTIVE audience promotion', async () => {
      const res = await request(app.getHttpServer())
        .post('/promotions')
        .send({ name: 'Promo inactifs', audience: PromotionAudience.INACTIVE })
        .expect(201);

      expect(res.body.data.audience).toBe(PromotionAudience.INACTIVE);
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/promotions')
        .send({ audience: PromotionAudience.ALL })
        .expect(400);
    });

    it('returns 400 when audience is invalid', async () => {
      await request(app.getHttpServer())
        .post('/promotions')
        .send({ name: 'Test', audience: 'invalid' })
        .expect(400);
    });
  });

  // ── PATCH /promotions/:id ───────────────────────────────────────────────────

  describe('PATCH /promotions/:id', () => {
    let promotionId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer()).post('/promotions').send(BASE_DTO);
      promotionId = res.body.data.id;
    });

    it('updates the promotion name', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/promotions/${promotionId}`)
        .send({ name: 'Nouveau nom', audience: PromotionAudience.ALL })
        .expect(200);

      expect(res.body.data.name).toBe('Nouveau nom');
    });
  });

  // ── PATCH /promotions/:id/archive ───────────────────────────────────────────

  describe('PATCH /promotions/:id/archive', () => {
    let promotionId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer()).post('/promotions').send(BASE_DTO);
      promotionId = res.body.data.id;
    });

    it('archives the promotion', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/promotions/${promotionId}/archive`)
        .expect(200);

      expect(res.body.data.status).toBe(PromotionStatus.ARCHIVED);
    });
  });

  // ── PATCH /promotions/:id/draft ─────────────────────────────────────────────

  describe('PATCH /promotions/:id/draft', () => {
    let promotionId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/promotions')
        .send({ ...BASE_DTO, status: PromotionInternalStatus.ACTIVE });
      promotionId = res.body.data.id;
    });

    it('sets promotion to draft', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/promotions/${promotionId}/draft`)
        .expect(200);

      expect(res.body.data.status).toBe(PromotionStatus.DRAFT);
    });
  });

  // ── PATCH /promotions/:id/publish ───────────────────────────────────────────

  describe('PATCH /promotions/:id/publish', () => {
    let promotionId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/promotions')
        .send({ ...BASE_DTO, status: PromotionInternalStatus.DRAFT });
      promotionId = res.body.data.id;
    });

    it('publishes the promotion', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/promotions/${promotionId}/publish`)
        .expect(200);

      expect(res.body.data.status).toBe(PromotionStatus.ACTIVE);
    });
  });
});
