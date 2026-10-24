import { Test, TestingModule } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';

import { CustomerPointsAddedEvent } from '../customer/events/customer-points-added.event';
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

    it('notifies the user of the points won, with the restaurant and the new balance', async () => {
      mockEm.findOneOrFail.mockResolvedValue(RESTAURANT);

      await listener.handlePointsAdded(event);

      expect(mockNotificationService.notify).toHaveBeenCalledWith(
        ['user-1'],
        'points',
        {
          headings: {
            fr: '+50 points chez Le Bistrot !',
            en: '+50 points at Le Bistrot!',
            es: '¡+50 puntos en Le Bistrot!',
          },
          contents: {
            fr: 'Votre solde : 150 points.',
            en: 'Your balance: 150 points.',
            es: 'Tu saldo: 150 puntos.',
          },
          data: { type: 'points.added', restaurantId: 'resto-1' },
        },
        'resto-1',
      );
    });

    it('writes "point" in the singular for a single point', async () => {
      mockEm.findOneOrFail.mockResolvedValue(RESTAURANT);

      await listener.handlePointsAdded(new CustomerPointsAddedEvent('user-1', 'resto-1', 1, 101));

      expect(mockNotificationService.notify).toHaveBeenCalledWith(
        ['user-1'],
        'points',
        expect.objectContaining({
          headings: {
            fr: '+1 point chez Le Bistrot !',
            en: '+1 point at Le Bistrot!',
            es: '¡+1 punto en Le Bistrot!',
          },
        }),
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
