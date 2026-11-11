import { INestApplication } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/postgresql';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import nock from 'nock';
import request from 'supertest';

import { Restaurant } from '../src/modules/restaurant/entities/restaurant.entity';
import { cleanBaseFixtures, createTestApp, seedBaseFixtures } from './helpers/app.helper';

describe('HubriseController (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;
  let restaurantId: string;
  const previousEnv = { ...process.env };

  beforeAll(async () => {
    Object.assign(process.env, {
      HUBRISE_CLIENT_ID: 'client-id',
      HUBRISE_CLIENT_SECRET: 'client-secret',
      PUBLIC_API_URL: 'https://api.example.com',
    });
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    const ctx = await createTestApp();
    app = ctx.app;
    em = ctx.em;
    ({ restaurantId } = await seedBaseFixtures(em));
    // HubRise renvoie le navigateur de l'admin, sans garantie de session sur ce domaine
    app
      .get<BetterAuthService, { api: { getSession: jest.Mock } }>(BetterAuthService)
      .api.getSession.mockResolvedValue(null);
  });

  afterAll(async () => {
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
    nock.enableNetConnect();
    process.env = previousEnv;
  });

  afterEach(() => {
    expect(nock.isDone()).toBe(true);
    nock.cleanAll();
  });

  it('connects the restaurant to its HubRise location without a session', async () => {
    nock('https://manager.hubrise.com')
      .post('/oauth2/v1/token', 'code=the-code&client_id=client-id&client_secret=client-secret')
      .reply(200, { access_token: 'the-token', location_id: 'loc-1' });
    nock('https://api.hubrise.com/v1', { reqheaders: { 'X-Access-Token': 'the-token' } })
      .post('/callback', {
        url: `https://api.example.com/hubrize/order/${restaurantId}`,
        events: { order: ['create', 'update'] },
      })
      .reply(200, {});

    await request(app.getHttpServer())
      .get(`/hubrize/oauth/callback/${restaurantId}`)
      .query({ code: 'the-code' })
      .expect(200, { connected: true });

    const restaurant = await em.fork().findOneOrFail(Restaurant, restaurantId);
    expect(restaurant).toMatchObject({
      hubriseAccessToken: 'the-token',
      hubriseLocationId: 'loc-1',
    });
  });

  it('answers 400 without a code', async () => {
    await request(app.getHttpServer()).get(`/hubrize/oauth/callback/${restaurantId}`).expect(400);
  });

  it('answers 404 for an unknown restaurant', async () => {
    await request(app.getHttpServer())
      .get('/hubrize/oauth/callback/00000000-0000-4000-8000-000000000000')
      .query({ code: 'the-code' })
      .expect(404);
  });
});
