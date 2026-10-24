import { Test, TestingModule } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';

import { CustomerPointsAddedEvent } from '../customer/events/customer-points-added.event';
import { Restaurant } from '../restaurant/entities/restaurant.entity';
import { pointsAddedMessage } from './messages';
import { NotificationListener } from './notification.listener';
import { NotificationService } from './notification.service';

const RESTAURANT = { id: 'resto-1', name: 'Le Bistrot' };

describe('NotificationListener', () => {
  let listener: NotificationListener;

  const mockEm = { fork: jest.fn(), findOneOrFail: jest.fn() };
  const mockNotificationService = { notify: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationListener,
        { provide: MikroORM, useValue: { em: mockEm } },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    listener = module.get(NotificationListener);
  });

  // ── handlePointsAdded ───────────────────────────────────────────────────────

  describe('handlePointsAdded', () => {
    const event = new CustomerPointsAddedEvent('user-1', 'resto-1', 50, 150, 'Menu du jour');

    it('notifies the user of the points won, in the restaurant', async () => {
      mockEm.findOneOrFail.mockResolvedValue(RESTAURANT);

      await listener.handlePointsAdded(event);

      expect(mockEm.findOneOrFail).toHaveBeenCalledWith(Restaurant, 'resto-1');
      expect(mockNotificationService.notify).toHaveBeenCalledWith(
        ['user-1'],
        'points',
        pointsAddedMessage(50, 150, RESTAURANT),
        'resto-1',
      );
    });

    it('does not throw when the notification fails', async () => {
      mockEm.findOneOrFail.mockResolvedValue(RESTAURANT);
      mockNotificationService.notify.mockRejectedValue(new Error('OneSignal down'));

      await expect(listener.handlePointsAdded(event)).resolves.toBeUndefined();
    });
  });
});
