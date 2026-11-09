import { INestApplication } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/postgresql';
import nock from 'nock';
import request from 'supertest';

import { cleanBaseFixtures, createTestApp, seedBaseFixtures } from './helpers/app.helper';

describe('GoogleController (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;
  let restaurantId: string;
  const previousKey = process.env.GOOGLE_API_KEY;
  const google = () =>
    nock('https://places.googleapis.com/v1', { reqheaders: { 'X-Goog-Api-Key': 'test-key' } });

  beforeAll(async () => {
    process.env.GOOGLE_API_KEY = 'test-key';
    nock.disableNetConnect();
    nock.enableNetConnect('127.0.0.1');
    const ctx = await createTestApp();
    app = ctx.app;
    em = ctx.em;
    ({ restaurantId } = await seedBaseFixtures(em));
  });

  afterAll(async () => {
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
    nock.enableNetConnect();
    process.env.GOOGLE_API_KEY = previousKey;
  });

  afterEach(() => {
    expect(nock.isDone()).toBe(true);
    nock.cleanAll();
  });

  it('POST /google/places/autocomplete forwards any body field and query parameter', async () => {
    const body = {
      input: 'Chez Mo',
      includedPrimaryTypes: ['restaurant'],
      locationBias: { circle: { center: { latitude: 49.44, longitude: 1.09 }, radius: 500 } },
    };
    google()
      .post('/places:autocomplete', body)
      .query({ fields: 'suggestions.placePrediction.placeId' })
      .reply(200, { suggestions: [{ placePrediction: { placeId: 'ChIJ-1' } }] });

    const res = await request(app.getHttpServer())
      .post('/google/places/autocomplete')
      .query({ fields: 'suggestions.placePrediction.placeId' })
      .send(body)
      .expect(200);

    expect(res.body).toEqual({ suggestions: [{ placePrediction: { placeId: 'ChIJ-1' } }] });
  });

  it('GET /google/places/:placeId forwards every query parameter', async () => {
    google()
      .get('/places/ChIJ-1')
      .query({ fields: 'id,displayName', languageCode: 'fr', sessionToken: 'abc' })
      .reply(200, { id: 'ChIJ-1', displayName: { text: 'Chez Momo' } });

    const res = await request(app.getHttpServer())
      .get('/google/places/ChIJ-1')
      .query({ fields: 'id,displayName', languageCode: 'fr', sessionToken: 'abc' })
      .expect(200);

    expect(res.body).toEqual({ id: 'ChIJ-1', displayName: { text: 'Chez Momo' } });
  });

  it("returns Google's error as is", async () => {
    const error = {
      error: { code: 400, message: 'Field mask is required', status: 'INVALID_ARGUMENT' },
    };
    google().get('/places/ChIJ-1').reply(400, error);

    const res = await request(app.getHttpServer()).get('/google/places/ChIJ-1').expect(400);

    expect(res.body).toEqual(error);
  });

  it('rejects a place id that would leave /places', async () => {
    await request(app.getHttpServer()).get('/google/places/%2E%2E').expect(400);
  });
});
