import { Test, TestingModule } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';

import { UserDeletedEvent } from '../../user/events/user-deleted.event';
import { NotificationPreferencesService } from '../notification-preferences.service';
import { NotificationService } from '../notification.service';
import { UserDeletedListener } from './user-deleted.listener';

describe('UserDeletedListener', () => {
  let listener: UserDeletedListener;

  const mockNotificationService = { deleteForUser: jest.fn() };
  const mockPreferencesService = { deletePreferences: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDeletedListener,
        { provide: MikroORM, useValue: { em: { fork: jest.fn() } } },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: NotificationPreferencesService, useValue: mockPreferencesService },
      ],
    }).compile();

    listener = module.get(UserDeletedListener);
  });

  it('deletes the notifications and the preferences of the deleted user', async () => {
    await listener.handleUserDeleted(new UserDeletedEvent('user-1'));

    expect(mockNotificationService.deleteForUser).toHaveBeenCalledWith('user-1');
    expect(mockPreferencesService.deletePreferences).toHaveBeenCalledWith('user-1');
  });

  it('does not throw when the cleanup fails', async () => {
    mockNotificationService.deleteForUser.mockRejectedValue(new Error('Database down'));

    await expect(
      listener.handleUserDeleted(new UserDeletedEvent('user-1')),
    ).resolves.toBeUndefined();
  });
});
