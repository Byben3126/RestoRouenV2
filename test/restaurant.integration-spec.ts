/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplication } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import { User } from '../src/auth/entities/user.entity';
import { Outlet } from '../src/restaurant/entities/outlet.entity';
import { Restaurant } from '../src/restaurant/entities/restaurant.entity';
import { SubscriptionService } from '../src/subscription/subscription.service';
import { AppUser } from '../src/user/entities/app-user.entity';
import { TEST_USER_ID, cleanBaseFixtures, createTestApp, seedUserOnly } from './helpers/app.helper';

const mockSubscriptionService = {
  ensureStripeCustomer: jest.fn().mockResolvedValue('cus_test123'),
  createPortalSession: jest.fn(),
  createCheckoutSession: jest.fn(),
  handleInvoicePaymentSucceeded: jest.fn(),
};

describe('RestaurantController (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;

  beforeAll(async () => {
    const ctx = await createTestApp({
      extraOverrides: (builder) =>
        builder.overrideProvider(SubscriptionService).useValue(mockSubscriptionService),
    });
    app = ctx.app;
    em = ctx.em;
    await seedUserOnly(em);
  });

  afterAll(async () => {
    await cleanBaseFixtures(em);
    await app.close();
  });

  // ── POST /restaurant ────────────────────────────────────────────────────────

  describe('POST /restaurant', () => {
    afterEach(async () => {
      await em.fork().nativeDelete(Restaurant, { user: TEST_USER_ID });
      jest.clearAllMocks();
    });

    it('creates a restaurant and returns 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/restaurant')
        .send({ name: 'Mon Restaurant' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Mon Restaurant');
      expect(Array.isArray(res.body.data.outlets)).toBe(true);
    });

    it('calls ensureStripeCustomer on creation', async () => {
      await request(app.getHttpServer())
        .post('/restaurant')
        .send({ name: 'Mon Restaurant' })
        .expect(201);

      expect(mockSubscriptionService.ensureStripeCustomer).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('returns 409 when a restaurant already exists for this user', async () => {
      await request(app.getHttpServer()).post('/restaurant').send({ name: 'Premier' });

      await request(app.getHttpServer()).post('/restaurant').send({ name: 'Deuxième' }).expect(409);
    });

    it('returns 400 when name is too short', async () => {
      await request(app.getHttpServer()).post('/restaurant').send({ name: 'A' }).expect(400);
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer()).post('/restaurant').send({}).expect(400);
    });
  });

  // ── GET /restaurant/me ──────────────────────────────────────────────────────

  describe('GET /restaurant/me', () => {
    let restaurantId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/restaurant')
        .send({ name: 'Mon Restaurant' });
      restaurantId = res.body.data.id;
    });

    afterAll(async () => {
      await em.fork().nativeDelete(Restaurant, { id: restaurantId });
    });

    it('returns the current user restaurant', async () => {
      const res = await request(app.getHttpServer()).get('/restaurant/me').expect(200);

      expect(res.body.data.id).toBe(restaurantId);
      expect(res.body.data.name).toBe('Mon Restaurant');
      expect(res.body.data.isActive).toBe(true);
    });

    it('returns media array in response', async () => {
      const { body } = await request(app.getHttpServer()).get('/restaurant/me').expect(200);

      expect(Array.isArray(body.data.medias)).toBe(true);
    });
  });

  // ── PATCH /restaurant/me ────────────────────────────────────────────────────

  describe('PATCH /restaurant/me', () => {
    let restaurantId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/restaurant')
        .send({ name: 'Mon Restaurant' });
      restaurantId = res.body.data.id;
    });

    afterAll(async () => {
      await em.fork().nativeDelete(Restaurant, { id: restaurantId });
    });

    it('updates the restaurant name', async () => {
      const res = await request(app.getHttpServer())
        .patch('/restaurant/me')
        .send({ name: 'Nouveau Nom' })
        .expect(200);

      expect(res.body.data.name).toBe('Nouveau Nom');
    });

    it('updates mediaIds alongside name', async () => {
      const res = await request(app.getHttpServer())
        .patch('/restaurant/me')
        .send({ name: 'Autre Nom', mediaIds: [] })
        .expect(200);

      expect(res.body.data.name).toBe('Autre Nom');
      expect(res.body.data.medias).toEqual([]);
    });
  });

  // ── GET /restaurant/search ──────────────────────────────────────────────────

  describe('GET /restaurant/search', () => {
    const fixtures = [
      { name: 'Le Café des Arts' },
      { name: 'Pizzeria Napoli' },
      { name: 'La Cafétéria' },
      { name: 'Sushi Bar' },
      { name: 'Café Fermé', isActive: false },
    ];
    const userIds = fixtures.map((_, i) => `search-user-${i}`);

    beforeAll(async () => {
      const fork = em.fork();
      fixtures.forEach((fixture, i) => {
        const user = fork.create(User, {
          id: userIds[i],
          name: `Search User ${i}`,
          email: `search-${i}@test.com`,
          emailVerified: true,
        } as any);
        const appUser = fork.create(AppUser, { authUser: user } as any);
        fork.create(Restaurant, { user: appUser, ...fixture } as any);
      });
      await fork.flush();
    });

    afterAll(async () => {
      const fork = em.fork();
      await fork.nativeDelete(Restaurant, { user: { $in: userIds } });
      await fork.nativeDelete(AppUser, { authUser: { $in: userIds } });
      await fork.nativeDelete(User, { id: { $in: userIds } });
    });

    const search = (query: Record<string, unknown>) =>
      request(app.getHttpServer()).get('/restaurant/search').query(query);
    const namesOf = (res: request.Response) =>
      (res.body.data.items as { name: string }[]).map((r) => r.name);

    it('ignores accents and case, and excludes inactive restaurants', async () => {
      const res = await search({ q: 'CAFE' }).expect(200);

      const found = namesOf(res);
      expect(found).toEqual(expect.arrayContaining(['Le Café des Arts', 'La Cafétéria']));
      expect(found).not.toContain('Café Fermé');
      expect(res.body.data.total).toBe(2);
    });

    it('ranks names starting with the query first', async () => {
      const res = await search({ q: 'la caf' }).expect(200);

      expect(res.body.data.items[0].name).toBe('La Cafétéria');
    });

    it('tolerates typos', async () => {
      const res = await search({ q: 'pizeria' }).expect(200);

      expect(namesOf(res)).toContain('Pizzeria Napoli');
    });

    it('paginates the results', async () => {
      const res = await search({ q: 'cafe', limit: 1, page: 2 }).expect(200);

      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data).toMatchObject({ total: 2, page: 2, limit: 1 });
    });

    it('returns 400 when the query is too short', async () => {
      await search({ q: ' a ' }).expect(400);
    });

    it('returns 400 when limit exceeds 50', async () => {
      await search({ q: 'cafe', limit: 51 }).expect(400);
    });
  });

  // ── /restaurant/me/outlets ──────────────────────────────────────────────────

  describe('/restaurant/me/outlets', () => {
    let restaurantId: string;
    let outletId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/restaurant')
        .send({ name: 'Mon Restaurant' });
      restaurantId = res.body.data.id;
    });

    afterAll(async () => {
      const fork = em.fork();
      await fork.nativeDelete(Outlet, { restaurant: restaurantId });
      await fork.nativeDelete(Restaurant, { id: restaurantId });
    });

    it('creates an outlet with coordinates', async () => {
      const res = await request(app.getHttpServer())
        .post('/restaurant/me/outlets')
        .send({ name: 'Centre', latitude: 49.44, longitude: 1.09 })
        .expect(201);

      outletId = res.body.data.id;
      expect(outletId).toBeDefined();
      expect(res.body.data.latitude).toBe(49.44);
      expect(res.body.data.longitude).toBe(1.09);
      expect(res.body.data.isActive).toBe(true);
    });

    it('returns 400 when latitude is out of range', async () => {
      await request(app.getHttpServer())
        .post('/restaurant/me/outlets')
        .send({ name: 'Centre', latitude: 120 })
        .expect(400);
    });

    it('lists the outlets of the current restaurant', async () => {
      const res = await request(app.getHttpServer()).get('/restaurant/me/outlets').expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].id).toBe(outletId);
    });

    it('updates the outlet latitude', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/restaurant/me/outlets/${outletId}`)
        .send({ latitude: 48.85 })
        .expect(200);

      expect(res.body.data.latitude).toBe(48.85);
      expect(res.body.data.longitude).toBe(1.09);
    });

    it('deletes the outlet', async () => {
      await request(app.getHttpServer()).delete(`/restaurant/me/outlets/${outletId}`).expect(204);

      await request(app.getHttpServer())
        .patch(`/restaurant/me/outlets/${outletId}`)
        .send({ name: 'X' })
        .expect(404);
    });
  });
});
