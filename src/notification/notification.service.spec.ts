import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { getRepositoryToken } from '@mikro-orm/nestjs';

import { Notification } from './entities/notification.entity';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';

const MESSAGE = {
  headings: { fr: '+50 points chez Le Bistrot !', en: '+50 points at Le Bistrot!' },
  contents: { fr: 'Votre solde : 150 points.', en: 'Your balance: 150 points.' },
  data: { type: 'points.added', restaurantId: 'resto-1' },
};

describe('NotificationService', () => {
  let service: NotificationService;

  const mockRepo = {
    createForUsers: jest.fn(),
    findPageForUser: jest.fn(),
    hasUnread: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  };
  const mockPreferencesService = { filterEnabled: jest.fn() };
  const mockPushService = { sendToUsers: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(Notification), useValue: mockRepo },
        { provide: NotificationPreferencesService, useValue: mockPreferencesService },
        { provide: PushNotificationService, useValue: mockPushService },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  describe('notify', () => {
    it('saves a notification for every user and pushes only to those who want it', async () => {
      mockPreferencesService.filterEnabled.mockResolvedValue(['user-1']);

      await service.notify(['user-1', 'user-2'], 'points', MESSAGE, 'resto-1');

      expect(mockRepo.createForUsers).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        MESSAGE,
        'resto-1',
      );
      expect(mockPreferencesService.filterEnabled).toHaveBeenCalledWith(
        ['user-1', 'user-2'],
        'points',
        'resto-1',
      );
      expect(mockPushService.sendToUsers).toHaveBeenCalledWith(['user-1'], MESSAGE);
    });

    it('saves an app notification without restaurant', async () => {
      mockPreferencesService.filterEnabled.mockResolvedValue(['user-1']);
      const message = { headings: { en: 'Welcome!' }, contents: { en: 'Hello' } };

      await service.notify(['user-1'], 'promotions', message);

      expect(mockRepo.createForUsers).toHaveBeenCalledWith(['user-1'], message, undefined);
      expect(mockPreferencesService.filterEnabled).toHaveBeenCalledWith(
        ['user-1'],
        'promotions',
        undefined,
      );
      expect(mockPushService.sendToUsers).toHaveBeenCalledWith(['user-1'], message);
    });

    it('does nothing without users', async () => {
      await service.notify([], 'points', MESSAGE, 'resto-1');

      expect(mockRepo.createForUsers).not.toHaveBeenCalled();
      expect(mockPushService.sendToUsers).not.toHaveBeenCalled();
    });
  });

  describe('getNotifications', () => {
    it('returns the cursor of the next page', async () => {
      const items = [{ id: 'notif-2' }, { id: 'notif-1' }];
      mockRepo.findPageForUser.mockResolvedValue({ items, hasNextPage: true, endCursor: 'abc' });

      const result = await service.getNotifications('user-1', { limit: 2 });

      expect(mockRepo.findPageForUser).toHaveBeenCalledWith('user-1', 2, undefined);
      expect(result).toEqual({ items, nextCursor: 'abc' });
    });

    it('returns a null cursor on the last page', async () => {
      const after = Buffer.from(JSON.stringify(['2026-10-24T10:00:00.000Z', 'notif-1'])).toString(
        'base64url',
      );
      mockRepo.findPageForUser.mockResolvedValue({
        items: [],
        hasNextPage: false,
        endCursor: null,
      });

      const result = await service.getNotifications('user-1', { after, limit: 20 });

      expect(mockRepo.findPageForUser).toHaveBeenCalledWith('user-1', 20, after);
      expect(result.nextCursor).toBeNull();
    });

    it('throws BadRequestException for an unreadable cursor', async () => {
      await expect(
        service.getNotifications('user-1', { after: 'not-a-cursor', limit: 20 }),
      ).rejects.toThrow(BadRequestException);
      expect(mockRepo.findPageForUser).not.toHaveBeenCalled();
    });
  });

  describe('hasUnread', () => {
    it('tells whether the user has unread notifications', async () => {
      mockRepo.hasUnread.mockResolvedValue(true);

      expect(await service.hasUnread('user-1')).toEqual({ hasUnread: true });
      expect(mockRepo.hasUnread).toHaveBeenCalledWith('user-1');
    });
  });

  describe('markAsRead', () => {
    it('returns the notification marked as read', async () => {
      const notification = { id: 'notif-1', readAt: new Date() };
      mockRepo.markAsRead.mockResolvedValue(notification);

      expect(await service.markAsRead('user-1', 'notif-1')).toBe(notification);
      expect(mockRepo.markAsRead).toHaveBeenCalledWith('user-1', 'notif-1');
    });

    it("throws NotFoundException for a notification that is not the user's", async () => {
      mockRepo.markAsRead.mockResolvedValue(null);

      await expect(service.markAsRead('user-1', 'notif-x')).rejects.toThrow(NotFoundException);
    });
  });
});
