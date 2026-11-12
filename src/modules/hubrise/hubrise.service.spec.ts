import { HttpException, NotFoundException } from '@nestjs/common';

import type { EntityManager } from '@mikro-orm/core';
import nock from 'nock';

import type { Outlet } from '../restaurant/entities/outlet.entity';
import type { OutletRepository } from '../restaurant/repositories/outlet.repository';
import type { HubriseEvent } from './dto/hubrise.dto';
import { HubriseService } from './hubrise.service';
import type { OrderRepository } from './repositories/order.repository';

const OUTLET_ID = '35544ebb-a62c-4585-a51d-3d49eeb5bdc6';

describe('HubriseService', () => {
  let service: HubriseService;
  let outlet: Partial<Outlet>;
  const outletRepository = { findOne: jest.fn() };
  const orderRepository = { saveFromHubrise: jest.fn() };
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
        url: `https://api.example.com/hubrize/order/${OUTLET_ID}`,
        events: { order: ['create', 'update'] },
      },
    );

  beforeAll(() => {
    process.env.HUBRISE_CLIENT_ID = 'client-id';
    process.env.HUBRISE_CLIENT_SECRET = 'client-secret';
    process.env.PUBLIC_API_URL = 'https://api.example.com';
    service = new HubriseService(
      outletRepository as unknown as OutletRepository,
      em as unknown as EntityManager,
      orderRepository as unknown as OrderRepository,
    );
    nock.disableNetConnect();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    outlet = { id: OUTLET_ID };
    outletRepository.findOne.mockResolvedValue(outlet);
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

  it('exchanges the code, subscribes to the orders and saves the token on the outlet', async () => {
    hubriseToken().reply(200, { access_token: 'the-token', location_id: 'loc-1' });
    hubriseCallback().reply(200, {});

    await service.connect(OUTLET_ID, 'the-code');

    expect(outlet).toMatchObject({
      hubriseAccessToken: 'the-token',
      hubriseLocationId: 'loc-1',
    });
    expect(em.flush).toHaveBeenCalled();
  });

  it('calls HubRise only for a known outlet', async () => {
    outletRepository.findOne.mockResolvedValue(null);

    await expect(service.connect(OUTLET_ID, 'the-code')).rejects.toThrow(NotFoundException);
  });

  it('forwards the HubRise error and saves nothing', async () => {
    hubriseToken().reply(400, { message: 'Invalid code' });

    await expect(service.connect(OUTLET_ID, 'the-code')).rejects.toThrow(HttpException);
    expect(outlet.hubriseAccessToken).toBeUndefined();
    expect(em.flush).not.toHaveBeenCalled();
  });

  describe('saveOrder', () => {
    const orderEvent = (state: Partial<HubriseEvent['new_state']> = {}): HubriseEvent => ({
      resource_type: 'order',
      event_type: 'create',
      new_state: {
        id: 'o-1',
        location_id: 'loc-1',
        status: 'new',
        total: '50.60 EUR',
        ref: '42',
        created_at: '2026-11-12T12:30:00+01:00',
        ...state,
      },
    });

    beforeEach(() => {
      outlet.hubriseLocationId = 'loc-1';
    });

    it('saves the order of the connected location, in cents with 1 point per whole euro', async () => {
      await service.saveOrder(OUTLET_ID, orderEvent());

      expect(orderRepository.saveFromHubrise).toHaveBeenCalledWith({
        hubriseOrderId: 'o-1',
        outlet,
        orderedAt: new Date('2026-11-12T11:30:00Z'),
        status: 'new',
        ref: '42',
        total: 5060,
        currency: 'EUR',
        points: 50,
      });
    });

    it('saves an order without ref', async () => {
      await service.saveOrder(OUTLET_ID, orderEvent({ ref: null, total: '0.99 EUR' }));

      expect(orderRepository.saveFromHubrise).toHaveBeenCalledWith(
        expect.objectContaining({ ref: undefined, total: 99, points: 0 }),
      );
    });

    it('ignores an order of another location', async () => {
      await service.saveOrder(OUTLET_ID, orderEvent({ location_id: 'loc-2' }));

      expect(orderRepository.saveFromHubrise).not.toHaveBeenCalled();
    });

    it('ignores an order for an unknown outlet', async () => {
      outletRepository.findOne.mockResolvedValue(null);

      await service.saveOrder(OUTLET_ID, orderEvent());

      expect(orderRepository.saveFromHubrise).not.toHaveBeenCalled();
    });

    it.each([
      ['another resource', { ...orderEvent(), resource_type: 'customer' }],
      ['no order state', { resource_type: 'order', event_type: 'create' }],
    ])('ignores an event with %s', async (_, event: HubriseEvent) => {
      await service.saveOrder(OUTLET_ID, event);

      expect(outletRepository.findOne).not.toHaveBeenCalled();
      expect(orderRepository.saveFromHubrise).not.toHaveBeenCalled();
    });
  });
});
