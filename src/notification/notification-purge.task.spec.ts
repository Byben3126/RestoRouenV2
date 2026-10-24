import { Test, TestingModule } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';

import { NotificationPurgeTask } from './notification-purge.task';
import { NotificationService } from './notification.service';

describe('NotificationPurgeTask', () => {
  let task: NotificationPurgeTask;

  const mockNotificationService = { purgeOld: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPurgeTask,
        { provide: MikroORM, useValue: { em: { fork: jest.fn() } } },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    task = module.get(NotificationPurgeTask);
  });

  it('purges the old notifications', async () => {
    mockNotificationService.purgeOld.mockResolvedValue(3);

    await task.purgeOldNotifications();

    expect(mockNotificationService.purgeOld).toHaveBeenCalled();
  });

  it('does not throw when the purge fails', async () => {
    mockNotificationService.purgeOld.mockRejectedValue(new Error('Database down'));

    await expect(task.purgeOldNotifications()).resolves.toBeUndefined();
  });
});
