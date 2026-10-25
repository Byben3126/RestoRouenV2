/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplication } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import { Account } from '../src/auth/entities/account.entity';
import { Session } from '../src/auth/entities/session.entity';
import { User } from '../src/auth/entities/user.entity';
import { Customer } from '../src/customer/entities/customer.entity';
import { Restaurant } from '../src/restaurant/entities/restaurant.entity';
import { AppUser } from '../src/user/entities/app-user.entity';
import { Person } from '../src/user/entities/person.entity';
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

  describe('PATCH /users/me', () => {
    const patchMe = (body: object) => request(app.getHttpServer()).patch('/users/me').send(body);

    it('updates the profile, the language and the Better Auth name', async () => {
      const res = await patchMe({
        firstName: 'Jean',
        lastName: 'Dupont',
        dateOfBirth: '1990-05-12',
        gender: 'male',
        city: 'Rouen',
        country: 'France',
        language: 'en',
      }).expect(200);
      expect(res.body.data).toMatchObject({ firstName: 'Jean', name: 'Jean Dupont' });

      const saved = await request(app.getHttpServer()).get('/users/me').expect(200);
      expect(saved.body.data).toMatchObject({
        firstName: 'Jean',
        lastName: 'Dupont',
        gender: 'male',
        city: 'Rouen',
        country: 'France',
        language: 'en',
        name: 'Jean Dupont',
      });
      expect(saved.body.data.dateOfBirth).toContain('1990-05-12');
    });

    it('only changes the fields sent', async () => {
      await patchMe({ firstName: 'Jean', city: 'Rouen' }).expect(200);
      await patchMe({ city: 'Paris' }).expect(200);

      const saved = await request(app.getHttpServer()).get('/users/me').expect(200);
      expect(saved.body.data).toMatchObject({ firstName: 'Jean', city: 'Paris' });
    });

    it('clears an optional field with null', async () => {
      await patchMe({ firstName: 'Jean', lastName: 'Dupont' }).expect(200);
      await patchMe({ lastName: null }).expect(200);

      const saved = await request(app.getHttpServer()).get('/users/me').expect(200);
      expect(saved.body.data.lastName).toBeNull();
      expect(saved.body.data.name).toBe('Jean');
    });

    it('returns 404 without creating the Person when it is missing', async () => {
      const fork = em.fork();
      await fork.nativeDelete(Person, { user: TEST_USER_ID });

      await patchMe({ city: 'Rouen' }).expect(404);
      expect(await fork.count(Person, { user: TEST_USER_ID })).toBe(0);

      // Remise en place pour les tests suivants
      fork.create(Person, {
        user: fork.getReference(AppUser, TEST_USER_ID),
        firstName: 'Integration',
      } as any);
      await fork.flush();
    });

    it('rejects an empty or null first name and an unknown value', async () => {
      await patchMe({ firstName: '' }).expect(400);
      await patchMe({ firstName: null }).expect(400);
      await patchMe({ gender: 'other' }).expect(400);
      await patchMe({ language: 'de' }).expect(400);
      await patchMe({ dateOfBirth: 'not-a-date' }).expect(400);
    });
  });

  // Supprime le compte de test : à garder en dernier
  describe('DELETE /users/me', () => {
    const OTHER_OWNER_ID = 'test-other-owner';

    afterAll(async () => {
      const fork = em.fork();
      await fork.nativeDelete(Customer, { user: TEST_USER_ID });
      await fork.nativeDelete(Restaurant, { user: OTHER_OWNER_ID });
      await fork.nativeDelete(AppUser, { authUser: OTHER_OWNER_ID });
      await fork.nativeDelete(User, { id: OTHER_OWNER_ID });
    });

    it('refuses while the user owns a restaurant', async () => {
      await request(app.getHttpServer()).delete('/users/me').expect(409);
    });

    it('anonymizes the account, logs it out everywhere and keeps its customer cards', async () => {
      const fork = em.fork();
      // Plus propriétaire, client d'un autre restaurant, connecté avec un mot de passe
      await fork.nativeDelete(Restaurant, { id: restaurantId });
      fork.create(User, {
        id: OTHER_OWNER_ID,
        name: 'Other Owner',
        email: 'other-owner@test.com',
        emailVerified: true,
      } as any);
      const otherOwner = fork.create(AppUser, {
        authUser: fork.getReference(User, OTHER_OWNER_ID),
      } as any);
      const otherRestaurant = fork.create(Restaurant, {
        user: otherOwner,
        name: 'Other Restaurant',
      } as any);
      fork.create(Customer, {
        user: fork.getReference(AppUser, TEST_USER_ID),
        restaurant: otherRestaurant,
      } as any);
      fork.create(Session, {
        id: 'test-session',
        token: 'test-session-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: fork.getReference(User, TEST_USER_ID),
      } as any);
      fork.create(Account, {
        id: 'test-account',
        accountId: TEST_USER_ID,
        providerId: 'credential',
        password: 'hashed-password',
        user: fork.getReference(User, TEST_USER_ID),
      } as any);
      await fork.flush();
      await request(app.getHttpServer()).patch('/users/me').send({ firstName: 'Jean' }).expect(200);

      await request(app.getHttpServer()).delete('/users/me').expect(204);

      const check = em.fork();
      expect(await check.findOneOrFail(User, TEST_USER_ID)).toMatchObject({
        email: `deleted-${TEST_USER_ID}@deleted.invalid`,
        name: 'Deleted user',
        image: null,
        emailVerified: false,
      });
      expect(await check.count(Session, { user: TEST_USER_ID })).toBe(0);
      expect(await check.count(Account, { user: TEST_USER_ID })).toBe(0);
      expect(await check.count(Person, { user: TEST_USER_ID })).toBe(0);
      const appUser = await check.findOneOrFail(AppUser, { authUser: TEST_USER_ID });
      expect(appUser.isActive).toBe(false);
      // Gardée pour les statistiques du restaurant
      expect(await check.count(Customer, { user: TEST_USER_ID })).toBe(1);
    });
  });
});
