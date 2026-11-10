import { HttpException } from '@nestjs/common';

import type { Redis } from 'ioredis';
import nock from 'nock';

import { GoogleService } from './google.service';

describe('GoogleService', () => {
  let service: GoogleService;
  const redis = { get: jest.fn(), set: jest.fn() };
  const google = () =>
    nock('https://places.googleapis.com/v1', { reqheaders: { 'X-Goog-Api-Key': 'key' } });

  beforeAll(() => {
    process.env.GOOGLE_API_KEY = 'key';
    service = new GoogleService(redis as unknown as Redis);
    nock.disableNetConnect();
  });

  beforeEach(() => {
    jest.resetAllMocks();
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

  describe('getPlaceDetails', () => {
    const details = { nationalPhoneNumber: '02 35 00 00 00', websiteUri: 'https://chezmomo.fr' };

    it('fetches phone, hours and website in the language asked, then caches them for 24 h', async () => {
      redis.get.mockResolvedValue(null);
      google()
        .get('/places/ChIJ-1')
        .query({ fields: 'nationalPhoneNumber,regularOpeningHours,websiteUri', languageCode: 'en' })
        .reply(200, details);

      await expect(service.getPlaceDetails('ChIJ-1', 'en')).resolves.toEqual(details);

      expect(redis.get).toHaveBeenCalledWith('google:place-details:ChIJ-1:en');
      expect(redis.set).toHaveBeenCalledWith(
        'google:place-details:ChIJ-1:en',
        JSON.stringify(details),
        'EX',
        24 * 60 * 60,
      );
    });

    it('answers from the cache without calling Google', async () => {
      redis.get.mockResolvedValue(JSON.stringify(details));

      await expect(service.getPlaceDetails('ChIJ-1', 'fr')).resolves.toEqual(details);

      expect(redis.set).not.toHaveBeenCalled();
    });

    it("does not cache Google's errors", async () => {
      redis.get.mockResolvedValue(null);
      google()
        .get('/places/ChIJ-1')
        .query(true)
        .reply(404, { error: { code: 404, status: 'NOT_FOUND' } });

      await expect(service.getPlaceDetails('ChIJ-1', 'fr')).rejects.toThrow(HttpException);

      expect(redis.set).not.toHaveBeenCalled();
    });
  });
});
