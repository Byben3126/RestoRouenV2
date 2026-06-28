import { INestApplication } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import {
  TEST_USER_ID,
  cleanBaseFixtures,
  createTestApp,
  seedBaseFixtures,
} from './helpers/app.helper';

describe('UserController (integration)', () => {
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
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
  });

  describe('GET /users/me', () => {
    it('returns 200 with the authenticated user data', async () => {
      const res = await request(app.getHttpServer()).get('/users/me').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        id: TEST_USER_ID,
        email: 'integration@test.com',
        name: 'Integration Test User',
        emailVerified: true,
        isActive: true,
      });
    });

    it('response contains profile and meta fields', async () => {
      const { body } = await request(app.getHttpServer()).get('/users/me').expect(200);
      const user = body.data;

      expect(user.id).toBeDefined();
      expect(user.language).toBeDefined();
      expect(user.linkCode).toBeDefined();
      expect(user.isRestaurantOwner).toBe(true);
    });

    it('response is wrapped in { success, data, timestamp }', async () => {
      const { body } = await request(app.getHttpServer()).get('/users/me').expect(200);

      expect(body.success).toBe(true);
      expect(body.timestamp).toBeDefined();
      expect(body.data).toBeDefined();
    });
  });
});
