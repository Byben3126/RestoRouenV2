import { Test, TestingModule } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';

import { CustomerPointsAddedEvent } from '../../customer/events/customer-points-added.event';
import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { pointsAddedMessage, ratingRequestMessage } from '../messages';
import { NotificationService } from '../notification.service';
import { CustomerPointsListener, RATING_REQUEST_DELAY_MS } from './customer-points.listener';

const RESTAURANT = { id: 'resto-1', name: 'Le Bistrot' };

describe('CustomerPointsListener', () => {
  let listener: CustomerPointsListener;

  const mockEm = { fork: jest.fn(), findOneOrFail: jest.fn() };
  const mockNotificationService = { notify: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerPointsListener,
        { provide: MikroORM, useValue: { em: mockEm } },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    listener = module.get(CustomerPointsListener);
  });

  describe('handlePointsAdded', () => {
    const event = new CustomerPointsAddedEvent('user-1', 'resto-1', 50, 150, 'Menu du jour');

    it('notifies the user of the points won, in the restaurant', async () => {
      mockEm.findOneOrFail.mockResolvedValue(RESTAURANT);

      await listener.handlePointsAdded(event);

      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(Restaurant, 'resto-1');
      expect(mockNotificationService.notify).toHaveBeenCalledWith({
        userIds: ['user-1'],
        category: 'points',
        message: pointsAddedMessage(50, 150, RESTAURANT),
        restaurantId: 'resto-1',
      });
    });

    it('asks to rate the visit 20 minutes later, once per user and restaurant', async () => {
      mockEm.findOneOrFail.mockResolvedValue(RESTAURANT);

      await listener.handlePointsAdded(event);

      expect(mockNotificationService.notify).toHaveBeenCalledWith({
        userIds: ['user-1'],
        category: 'ratings',
        message: ratingRequestMessage(RESTAURANT),
        restaurantId: 'resto-1',
        delay: RATING_REQUEST_DELAY_MS,
        key: 'rating-request-user-1-resto-1',
        duplicationMode: 'ignore',
      });
      expect(RATING_REQUEST_DELAY_MS).toBe(20 * 60 * 1000);
    });

    it('does not throw when the queue is unavailable', async () => {
      mockEm.findOneOrFail.mockResolvedValue(RESTAURANT);
      mockNotificationService.notify.mockRejectedValue(new Error('Redis down'));

      await expect(listener.handlePointsAdded(event)).resolves.toBeUndefined();
    });
  });
});
