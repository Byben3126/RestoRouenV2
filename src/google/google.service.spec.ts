import { HttpException } from '@nestjs/common';

import nock from 'nock';

import { GoogleService } from './google.service';

describe('GoogleService', () => {
  let service: GoogleService;
  const google = () =>
    nock('https://places.googleapis.com/v1', { reqheaders: { 'X-Goog-Api-Key': 'key' } });

  beforeAll(() => {
    process.env.GOOGLE_API_KEY = 'key';
    service = new GoogleService();
    nock.disableNetConnect();
  });

  afterAll(() => {
    delete process.env.GOOGLE_API_KEY;
    nock.enableNetConnect();
  });

  afterEach(() => {
    expect(nock.isDone()).toBe(true);
    nock.cleanAll();
  });

  it('forwards the autocomplete body and query with the server key', async () => {
    const body = { input: 'Chez Mo', includedRegionCodes: ['fr'], sessionToken: 'abc' };
    google()
      .post('/places:autocomplete', body)
      .query({ fields: 'suggestions.placePrediction.placeId' })
      .reply(200, { suggestions: [] });

    await expect(
      service.autocomplete(body, { fields: 'suggestions.placePrediction.placeId' }),
    ).resolves.toEqual({ suggestions: [] });
  });

  it('forwards every query parameter of place details', async () => {
    google()
      .get('/places/ChIJ-1')
      .query({ fields: 'id,location', languageCode: 'fr' })
      .reply(200, { id: 'ChIJ-1' });

    await expect(
      service.getPlace('ChIJ-1', { fields: 'id,location', languageCode: 'fr' }),
    ).resolves.toEqual({ id: 'ChIJ-1' });
  });

  it("returns Google's error with its status", async () => {
    const error = { error: { code: 400, message: 'Field mask is required' } };
    google().get('/places/ChIJ-1').reply(400, error);

    const thrown = await service.getPlace('ChIJ-1', {}).catch((e: HttpException) => e);
    expect(thrown).toBeInstanceOf(HttpException);
    expect((thrown as HttpException).getStatus()).toBe(400);
    expect((thrown as HttpException).getResponse()).toEqual(error);
  });
});
