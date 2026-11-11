import { HttpException, NotFoundException } from '@nestjs/common';

import type { EntityManager } from '@mikro-orm/core';
import nock from 'nock';

import type { Restaurant } from '../restaurant/entities/restaurant.entity';
import type { RestaurantRepository } from '../restaurant/repositories/restaurant.repository';
import { HubriseService } from './hubrise.service';

const RESTAURANT_ID = '35544ebb-a62c-4585-a51d-3d49eeb5bdc6';

describe('HubriseService', () => {
  let service: HubriseService;
  let restaurant: Partial<Restaurant>;
  const restaurantRepository = { findOne: jest.fn() };
  const em = { flush: jest.fn() };

  const hubriseToken = () =>
    nock('https://manager.hubrise.com').post(
      '/oauth2/v1/token',
      'code=the-code&client_id=client-id&client_secret=client-secret',
    );
  const hubriseCallback = () =>
    nock('https://api.hubrise.com/v1', { reqheaders: { 'X-Access-Token': 'the-token' } }).post(
      '/callback',
      {
        url: `https://api.example.com/hubrize/order/${RESTAURANT_ID}`,
        events: { order: ['create', 'update'] },
      },
    );

  beforeAll(() => {
    process.env.HUBRISE_CLIENT_ID = 'client-id';
    process.env.HUBRISE_CLIENT_SECRET = 'client-secret';
    process.env.PUBLIC_API_URL = 'https://api.example.com';
    service = new HubriseService(
      restaurantRepository as unknown as RestaurantRepository,
      em as unknown as EntityManager,
    );
    nock.disableNetConnect();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    restaurant = { id: RESTAURANT_ID };
    restaurantRepository.findOne.mockResolvedValue(restaurant);
  });

  afterAll(() => {
    delete process.env.HUBRISE_CLIENT_ID;
    delete process.env.HUBRISE_CLIENT_SECRET;
    delete process.env.PUBLIC_API_URL;
    nock.enableNetConnect();
  });

  afterEach(() => {
    expect(nock.isDone()).toBe(true);
    nock.cleanAll();
  });

  it('exchanges the code, subscribes to the orders and saves the token', async () => {
    hubriseToken().reply(200, { access_token: 'the-token', location_id: 'loc-1' });
    hubriseCallback().reply(200, {});

    await service.connect(RESTAURANT_ID, 'the-code');

    expect(restaurant).toMatchObject({
      hubriseAccessToken: 'the-token',
      hubriseLocationId: 'loc-1',
    });
    expect(em.flush).toHaveBeenCalled();
  });

  it('calls HubRise only for a known restaurant', async () => {
    restaurantRepository.findOne.mockResolvedValue(null);

    await expect(service.connect(RESTAURANT_ID, 'the-code')).rejects.toThrow(NotFoundException);
  });

  it('forwards the HubRise error and saves nothing', async () => {
    hubriseToken().reply(400, { message: 'Invalid code' });

    await expect(service.connect(RESTAURANT_ID, 'the-code')).rejects.toThrow(HttpException);
    expect(restaurant.hubriseAccessToken).toBeUndefined();
    expect(em.flush).not.toHaveBeenCalled();
  });
});
