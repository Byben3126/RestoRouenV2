import { INestApplication } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import { User } from '@app/auth/entities/user.entity';

import {
  TEST_USER_ID,
  createTestApp,
  seedBaseFixtures,
  cleanBaseFixtures,
} from './helpers/app.helper';
import { Customer } from '../src/customer/entities/customer.entity';
import { AppUser } from '../src/user/entities/app-user.entity';

const CUSTOMER_USER_ID = 'test-customer-user';

describe('CustomerController (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;
  let restaurantId: string;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    em = ctx.em;
    ({ restaurantId } = await seedBaseFixtures(em));

    // Seed a customer user + link them to the restaurant
    const fork = em.fork();
    fork.create(User, {
      id: CUSTOMER_USER_ID,
      name: 'Customer User',
      email: 'customer@test.com',
      emailVerified: false,
    });
    fork.create(AppUser, { authUser: fork.getReference(User, CUSTOMER_USER_ID) });
    await fork.flush();

    fork.create(Customer, {
      user: fork.getReference(AppUser, CUSTOMER_USER_ID),
      restaurant: restaurantId as any,
      points: 50,
      totalPointsGained: 100,
    });
    await fork.flush();
  });

  afterAll(async () => {
    const fork = em.fork();
    await fork.nativeDelete(Customer, { restaurant: restaurantId });
    await fork.nativeDelete(AppUser, { authUser: CUSTOMER_USER_ID });
    await fork.nativeDelete(User, { id: CUSTOMER_USER_ID });
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
  });

  // ── GET /customers ──────────────────────────────────────────────────────────

  describe('GET /customers', () => {
    it('returns 200 with paginated customers', async () => {
      const res = await request(app.getHttpServer()).get('/customers').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
    });

    it('customer contains expected fields', async () => {
      const { body } = await request(app.getHttpServer()).get('/customers').expect(200);
      const customer = body.data.items[0];

      expect(customer.id).toBeDefined();
      expect(customer.points).toBe(50);
    });

    it('supports pagination params', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers?page=1&limit=5')
        .expect(200);

      expect(res.body.data.page).toBe(1);
      expect(res.body.data.limit).toBe(5);
    });

    it('returns empty items on page 2 when only 1 customer exists', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers?page=2&limit=10')
        .expect(200);

      expect(res.body.data.items).toHaveLength(0);
      expect(res.body.data.total).toBe(1);
    });

    it('filters by search term matching email', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers?search=customer@test')
        .expect(200);

      expect(res.body.data.total).toBe(1);
    });

    it('returns empty when search does not match', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers?search=nobody')
        .expect(200);

      expect(res.body.data.total).toBe(0);
      expect(res.body.data.items).toHaveLength(0);
    });
  });
});
