/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { INestApplication } from '@nestjs/common';

import { MikroORM, RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import { Customer } from '../src/customer/entities/customer.entity';
import { NotificationPreferences } from '../src/notification/entities/notification-preferences.entity';
import {
  NotificationCategory,
  NotificationPreferencesService,
} from '../src/notification/notification-preferences.service';
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
  let orm: MikroORM;
  let em: EntityManager;
  let restaurantId: string;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    orm = ctx.orm;
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

    it('tells whether the notifications of a restaurant are on, and on by default', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/me/notification-preferences/restaurants/${restaurantId}`)
        .expect(200);
      expect(res.body.data).toEqual({
        restaurant: { id: restaurantId, name: 'Test Restaurant' },
        enabled: true,
      });

      await request(app.getHttpServer())
        .patch(`/users/me/notification-preferences/restaurants/${restaurantId}`)
        .send({ enabled: false })
        .expect(200);

      const saved = await request(app.getHttpServer())
        .get(`/users/me/notification-preferences/restaurants/${restaurantId}`)
        .expect(200);
      expect(saved.body.data.enabled).toBe(false);
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
        .get(`/users/me/notification-preferences/restaurants/${UNKNOWN_ID}`)
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/users/me/notification-preferences/restaurants/${UNKNOWN_ID}`)
        .send({ enabled: false })
        .expect(404);
    });
  });

  // ── filterEnabled ───────────────────────────────────────────────────────────

  describe('NotificationPreferencesService.filterEnabled', () => {
    const filterEnabled = (category: NotificationCategory, restaurant?: string) =>
      RequestContext.create(orm.em, () =>
        app.get(NotificationPreferencesService).filterEnabled([TEST_USER_ID], category, restaurant),
      );

    beforeEach(async () => {
      const fork = em.fork();
      fork.create(Customer, {
        user: fork.getReference(AppUser, TEST_USER_ID),
        restaurant: restaurantId,
      } as any);
      await fork.flush();
    });

    it('keeps a customer of the restaurant who changed nothing', async () => {
      expect(await filterEnabled('points', restaurantId)).toEqual([TEST_USER_ID]);
    });

    it('removes a user who turned off the category, only for that category', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/notification-preferences')
        .send({ points: false })
        .expect(200);

      expect(await filterEnabled('points', restaurantId)).toEqual([]);
      expect(await filterEnabled('rewards', restaurantId)).toEqual([TEST_USER_ID]);
    });

    it('removes a user who turned off the restaurant', async () => {
      await request(app.getHttpServer())
        .patch(`/users/me/notification-preferences/restaurants/${restaurantId}`)
        .send({ enabled: false })
        .expect(200);

      expect(await filterEnabled('points', restaurantId)).toEqual([]);
    });

    it('removes a user who is not a customer of the restaurant', async () => {
      expect(await filterEnabled('points', UNKNOWN_ID)).toEqual([]);
    });

    it('only checks the category for an app notification, without restaurant', async () => {
      await request(app.getHttpServer())
        .patch(`/users/me/notification-preferences/restaurants/${restaurantId}`)
        .send({ enabled: false })
        .expect(200);

      expect(await filterEnabled('promotions')).toEqual([TEST_USER_ID]);
    });
  });
});
