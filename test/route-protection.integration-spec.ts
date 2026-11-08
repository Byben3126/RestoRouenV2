import { INestApplication } from '@nestjs/common';

import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import request from 'supertest';

import { TEST_USER_ID, createTestApp } from './helpers/app.helper';

describe('Route protection (integration)', () => {
  let app: INestApplication;
  let getSession: jest.Mock;

  /** Session renvoyée au guard global de nestjs-better-auth ; null : pas connecté */
  const signIn = (role: string | null | undefined) =>
    getSession.mockResolvedValue(
      role === null ? null : { user: { id: TEST_USER_ID, role }, session: {} },
    );

  beforeAll(async () => {
    // AdminJS est remplacé par un faux router ; Bull Board est le vrai, monté sous /dev/queues
    ({ app } = await createTestApp());
    // better-auth est simulé dans les tests : getSession est un jest.fn
    getSession = app.get<BetterAuthService, { api: { getSession: jest.Mock } }>(BetterAuthService)
      .api.getSession;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('API', () => {
    it('answers 401 without a session', async () => {
      signIn(null);
      await request(app.getHttpServer()).get('/users/me/notifications').expect(401);
    });

    it('keeps the routes marked @AllowAnonymous public', async () => {
      signIn(null);
      await request(app.getHttpServer()).get('/').expect(200);
    });
  });

  describe('/admin', () => {
    it('answers 401 without a session', async () => {
      signIn(null);
      await request(app.getHttpServer()).get('/admin').expect(401);
    });

    it('answers 403 without the admin role', async () => {
      signIn('user');
      await request(app.getHttpServer()).get('/admin').expect(403);
      signIn('dev');
      await request(app.getHttpServer()).get('/admin/resources/User').expect(403);
    });

    it('lets an admin through to AdminJS, sub-paths included', async () => {
      signIn('admin');
      await request(app.getHttpServer()).get('/admin').expect(200, 'AdminJS');
      await request(app.getHttpServer()).get('/admin/resources/User?page=2').expect(200, 'AdminJS');
    });
  });

  describe('/dev/queues', () => {
    it('answers 403 without the dev role', async () => {
      signIn('admin');
      await request(app.getHttpServer()).get('/dev/queues').expect(403);
    });

    it('lets a dev through to Bull Board, which lists the notifications queue', async () => {
      signIn('dev');
      await request(app.getHttpServer())
        .get('/dev/queues')
        .expect(200)
        .expect('Content-Type', /html/);
      const res = await request(app.getHttpServer())
        .get('/dev/queues/api/queues?activeQueue=notifications&page=1&jobsPerPage=1')
        .expect(200);
      expect((res.body as { queues: { name: string }[] }).queues.map((q) => q.name)).toContain(
        'notifications',
      );
    });
  });

  it('accepts several roles on one account', async () => {
    signIn('admin,dev');
    await request(app.getHttpServer()).get('/admin').expect(200);
    await request(app.getHttpServer()).get('/dev/queues').expect(200);
  });
});
