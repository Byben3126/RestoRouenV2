import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { getRepositoryToken } from '@mikro-orm/nestjs';

import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { NOTIFICATIONS_QUEUE, SEND_NOTIFICATION_JOB } from './queue/notification.constants';

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
    deleteCreatedBefore: jest.fn(),
  };
  const mockQueue = { add: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(Notification), useValue: mockRepo },
        { provide: getQueueToken(NOTIFICATIONS_QUEUE), useValue: mockQueue },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  describe('notify', () => {
    it('puts the notification in the queue instead of sending it', async () => {
      await service.notify({
        userIds: ['user-1', 'user-2'],
        category: 'points',
        message: MESSAGE,
        restaurantId: 'resto-1',
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        SEND_NOTIFICATION_JOB,
        {
          userIds: ['user-1', 'user-2'],
          category: 'points',
          message: MESSAGE,
          restaurantId: 'resto-1',
        },
        {},
      );
      expect(mockRepo.createForUsers).not.toHaveBeenCalled();
    });

    it('delays the notification and uses the key as job id, outside of the job data', async () => {
      await service.notify({
        userIds: ['user-1'],
        category: 'ratings',
        message: MESSAGE,
        restaurantId: 'resto-1',
        delay: 60_000,
        key: 'rating-request-user-1-resto-1',
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        SEND_NOTIFICATION_JOB,
        { userIds: ['user-1'], category: 'ratings', message: MESSAGE, restaurantId: 'resto-1' },
        { delay: 60_000, jobId: 'rating-request-user-1-resto-1' },
      );
    });

    it('queues nothing without users', async () => {
      await service.notify({ userIds: [], category: 'points', message: MESSAGE });

      expect(mockQueue.add).not.toHaveBeenCalled();
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

  describe('purgeOld', () => {
    it('deletes the notifications created more than 90 days ago', async () => {
      mockRepo.deleteCreatedBefore.mockResolvedValue(12);

      expect(await service.purgeOld()).toBe(12);

      const [before] = mockRepo.deleteCreatedBefore.mock.calls[0] as [Date];
      const days = (Date.now() - before.getTime()) / (24 * 60 * 60 * 1000);
      // À une heure près (changement d'heure)
      expect(days).toBeCloseTo(90, 1);
    });
  });
});
