import { Test, TestingModule } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';

import { CustomerPointsAddedEvent } from '../customer/events/customer-points-added.event';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PushNotificationListener } from './push-notification.listener';
import { PushNotificationService } from './push-notification.service';

const RESTAURANT = { id: 'resto-1', name: 'Le Bistrot' };

describe('PushNotificationListener', () => {
  let listener: PushNotificationListener;

  const mockEm = { fork: jest.fn(), findOneOrFail: jest.fn() };
  const mockPreferencesService = { isEnabled: jest.fn() };
  const mockPushService = { sendToUsers: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushNotificationListener,
        { provide: MikroORM, useValue: { em: mockEm } },
        { provide: NotificationPreferencesService, useValue: mockPreferencesService },
        { provide: PushNotificationService, useValue: mockPushService },
      ],
    }).compile();

    listener = module.get(PushNotificationListener);
  });

  // ── handlePointsAdded ───────────────────────────────────────────────────────

  describe('handlePointsAdded', () => {
    const event = new CustomerPointsAddedEvent('user-1', 'resto-1', 50, 150, 'Menu du jour');

    it('notifies the user of the points won, with the restaurant and the new balance', async () => {
      mockPreferencesService.isEnabled.mockResolvedValue(true);
      mockEm.findOneOrFail.mockResolvedValue(RESTAURANT);

      await listener.handlePointsAdded(event);

      expect(mockPreferencesService.isEnabled).toHaveBeenCalledWith('user-1', 'points', 'resto-1');
      expect(mockPushService.sendToUsers).toHaveBeenCalledWith(['user-1'], {
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
      });
    });

    it('writes "point" in the singular for a single point', async () => {
      mockPreferencesService.isEnabled.mockResolvedValue(true);
      mockEm.findOneOrFail.mockResolvedValue(RESTAURANT);

      await listener.handlePointsAdded(new CustomerPointsAddedEvent('user-1', 'resto-1', 1, 101));

      expect(mockPushService.sendToUsers).toHaveBeenCalledWith(
        ['user-1'],
        expect.objectContaining({
          headings: {
            fr: '+1 point chez Le Bistrot !',
            en: '+1 point at Le Bistrot!',
            es: '¡+1 punto en Le Bistrot!',
          },
        }),
      );
    });

    it('sends nothing when the user turned off the points or this restaurant', async () => {
      mockPreferencesService.isEnabled.mockResolvedValue(false);

      await listener.handlePointsAdded(event);

      expect(mockEm.findOneOrFail).not.toHaveBeenCalled();
      expect(mockPushService.sendToUsers).not.toHaveBeenCalled();
    });

    it('does not throw when the push fails', async () => {
      mockPreferencesService.isEnabled.mockResolvedValue(true);
      mockEm.findOneOrFail.mockResolvedValue(RESTAURANT);
      mockPushService.sendToUsers.mockRejectedValue(new Error('OneSignal down'));

      await expect(listener.handlePointsAdded(event)).resolves.toBeUndefined();
    });
  });
});
