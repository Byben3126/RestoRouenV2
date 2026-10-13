/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplication } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import { Customer } from '../src/customer/entities/customer.entity';
import { NotificationPreferences } from '../src/notification/entities/notification-preferences.entity';
import { AppUser } from '../src/user/entities/app-user.entity';
import {
  TEST_USER_ID,
  cleanBaseFixtures,
  createTestApp,
  seedBaseFixtures,
} from './helpers/app.helper';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('UserNotificationPreferencesController (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;
  let restaurantId: string;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    em = ctx.em;
    ({ restaurantId } = await seedBaseFixtures(em));
  });

  afterEach(async () => {
    const fork = em.fork();
    await fork.nativeDelete(NotificationPreferences, { user: TEST_USER_ID });
    await fork.nativeDelete(Customer, { user: TEST_USER_ID });
  });

  afterAll(async () => {
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
  });

  // ── Catégories ──────────────────────────────────────────────────────────────

  describe('GET /users/me/notification-preferences', () => {
    it('enables every category by default', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/notification-preferences')
        .expect(200);

      expect(res.body.data).toEqual({
        points: true,
        rewards: true,
        promotions: true,
        ratings: true,
      });
    });
  });

  describe('PATCH /users/me/notification-preferences', () => {
    it('turns off only the categories sent, and keeps them', async () => {
      const res = await request(app.getHttpServer())
        .patch('/users/me/notification-preferences')
        .send({ promotions: false })
        .expect(200);
      expect(res.body.data).toEqual({
        points: true,
        rewards: true,
        promotions: false,
        ratings: true,
      });

      await request(app.getHttpServer())
        .patch('/users/me/notification-preferences')
        .send({ ratings: false })
        .expect(200);

      const saved = await request(app.getHttpServer())
        .get('/users/me/notification-preferences')
        .expect(200);
      expect(saved.body.data).toMatchObject({ promotions: false, ratings: false });
    });

    it('rejects a value that is not a boolean', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/notification-preferences')
        .send({ promotions: 'no' })
        .expect(400);
    });
  });

  // ── Restaurants ─────────────────────────────────────────────────────────────

  describe('restaurants', () => {
    beforeEach(async () => {
      const fork = em.fork();
      fork.create(Customer, {
        user: fork.getReference(AppUser, TEST_USER_ID),
        restaurant: restaurantId,
      } as any);
      await fork.flush();
    });

    it('lists the restaurants of the user, all enabled by default', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/notification-preferences/restaurants')
        .expect(200);

      expect(res.body.data).toEqual([
        { restaurant: { id: restaurantId, name: 'Test Restaurant' }, enabled: true },
      ]);
    });

    it('turns off then back on every notification of a restaurant', async () => {
      const disabled = await request(app.getHttpServer())
        .patch(`/users/me/notification-preferences/restaurants/${restaurantId}`)
        .send({ enabled: false })
        .expect(200);
      expect(disabled.body.data).toEqual({
        restaurant: { id: restaurantId, name: 'Test Restaurant' },
        enabled: false,
      });
      const customer = await em
        .fork()
        .findOneOrFail(Customer, { user: TEST_USER_ID, restaurant: restaurantId });
      expect(customer.notificationsEnabled).toBe(false);

      const enabled = await request(app.getHttpServer())
        .patch(`/users/me/notification-preferences/restaurants/${restaurantId}`)
        .send({ enabled: true })
        .expect(200);
      expect(enabled.body.data.enabled).toBe(true);
    });

    it('returns 404 for a restaurant the user is not a customer of', async () => {
      await request(app.getHttpServer())
        .patch(`/users/me/notification-preferences/restaurants/${UNKNOWN_ID}`)
        .send({ enabled: false })
        .expect(404);
    });
  });
});
