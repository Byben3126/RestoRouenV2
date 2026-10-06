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
    let userIds: string[] = [];

    beforeAll(async () => {
      userIds = await seedRestaurants(em, 'search', fixtures);
    });

    afterAll(async () => {
      await cleanRestaurants(em, userIds);
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

  // ── GET /restaurant/nearby ──────────────────────────────────────────────────

  describe('GET /restaurant/nearby', () => {
    // Loin de toute donnée réelle (Svalbard) ; 0.01° de latitude ≈ 1,1 km
    const lat = 78.22;
    const lon = 15.65;
    const fixtures = [
      { name: 'Tout Près', outlets: [{ name: 'Centre', latitude: lat, longitude: lon }] },
      {
        name: 'Deux Adresses',
        outlets: [
          { name: 'Loin', latitude: lat + 0.3, longitude: lon },
          { name: 'Proche', latitude: lat + 0.02, longitude: lon },
          { name: 'Aussi Proche', latitude: lat + 0.05, longitude: lon },
        ],
      },
      { name: 'Hors Rayon', outlets: [{ name: 'Loin', latitude: lat + 0.5, longitude: lon }] },
      {
        name: 'Restaurant Inactif',
        isActive: false,
        outlets: [{ name: 'Centre', latitude: lat, longitude: lon }],
      },
      {
        name: 'Point De Vente Inactif',
        outlets: [{ name: 'Centre', latitude: lat, longitude: lon, isActive: false }],
      },
      { name: 'Sans Coordonnées', outlets: [{ name: 'Centre' }] },
    ];
    let userIds: string[] = [];

    beforeAll(async () => {
      userIds = await seedRestaurants(em, 'nearby', fixtures);
    });

    afterAll(async () => {
      await cleanRestaurants(em, userIds);
    });

    type NearbyItem = { name: string; outlets: { name: string; distance: number }[] };
    const nearby = (query: Record<string, unknown>) =>
      request(app.getHttpServer()).get('/restaurant/nearby').query(query);

    it('returns active restaurants within the radius, closest first', async () => {
      const res = await nearby({ latitude: lat, longitude: lon, radius: 10 }).expect(200);

      const items = res.body.data.items as NearbyItem[];
      expect(items.map((r) => r.name)).toEqual(['Tout Près', 'Deux Adresses']);
      expect(items[0].outlets[0].distance).toBe(0);
      expect(items[1].outlets[0].distance).toBeGreaterThan(2000);
      expect(items[1].outlets[0].distance).toBeLessThan(2400);
      expect(res.body.data.total).toBe(2);
    });

    it('returns only the outlets within the radius, closest first', async () => {
      const res = await nearby({ latitude: lat, longitude: lon, radius: 10 }).expect(200);

      const outlets = (res.body.data.items as NearbyItem[])[1].outlets;
      expect(outlets.map((o) => o.name)).toEqual(['Proche', 'Aussi Proche']);
      expect(outlets[0].distance).toBeLessThan(outlets[1].distance);
    });

    it('includes the farther outlet once the radius covers it', async () => {
      const res = await nearby({ latitude: lat, longitude: lon, radius: 50 }).expect(200);

      const outlets = (res.body.data.items as NearbyItem[]).find(
        (r) => r.name === 'Deux Adresses',
      )!.outlets;
      expect(outlets.map((o) => o.name)).toEqual(['Proche', 'Aussi Proche', 'Loin']);
    });

    it('excludes restaurants outside a smaller radius', async () => {
      const res = await nearby({ latitude: lat, longitude: lon, radius: 1 }).expect(200);

      const items = res.body.data.items as { name: string }[];
      expect(items.map((r) => r.name)).toEqual(['Tout Près']);
    });

    it('paginates the results', async () => {
      const res = await nearby({ latitude: lat, longitude: lon, limit: 1, page: 2 }).expect(200);

      expect(res.body.data.items[0].name).toBe('Deux Adresses');
      expect(res.body.data).toMatchObject({ total: 2, page: 2, limit: 1 });
    });

    it('returns 400 when coordinates are missing or invalid', async () => {
      await nearby({ longitude: lon }).expect(400);
      await nearby({ latitude: 120, longitude: lon }).expect(400);
    });

    it('returns 400 when radius exceeds 50 km', async () => {
      await nearby({ latitude: lat, longitude: lon, radius: 51 }).expect(400);
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface RestaurantFixture {
  name: string;
  isActive?: boolean;
  outlets?: Partial<Outlet>[];
}

/** Crée un utilisateur par restaurant (user est obligatoire) et renvoie leurs ids */
async function seedRestaurants(
  em: EntityManager,
  prefix: string,
  fixtures: RestaurantFixture[],
): Promise<string[]> {
  const fork = em.fork();
  const userIds = fixtures.map((_, i) => `${prefix}-user-${i}`);
  fixtures.forEach(({ outlets = [], ...fixture }, i) => {
    const user = fork.create(User, {
      id: userIds[i],
      name: `${prefix} user ${i}`,
      email: `${prefix}-${i}@test.com`,
      emailVerified: true,
    } as any);
    const appUser = fork.create(AppUser, { authUser: user } as any);
    const restaurant = fork.create(Restaurant, { user: appUser, ...fixture } as any);
    outlets.forEach((outlet) => fork.create(Outlet, { restaurant, ...outlet } as any));
  });
  await fork.flush();
  return userIds;
}

async function cleanRestaurants(em: EntityManager, userIds: string[]): Promise<void> {
  const fork = em.fork();
  await fork.nativeDelete(Outlet, { restaurant: { user: { $in: userIds } } });
  await fork.nativeDelete(Restaurant, { user: { $in: userIds } });
  await fork.nativeDelete(AppUser, { authUser: { $in: userIds } });
  await fork.nativeDelete(User, { id: { $in: userIds } });
}
