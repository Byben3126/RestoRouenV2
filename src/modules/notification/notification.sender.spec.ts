import { Test, TestingModule } from '@nestjs/testing';

import { getRepositoryToken } from '@mikro-orm/nestjs';

import { Notification } from './entities/notification.entity';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationSender } from './notification.sender';
import { PushNotificationService } from './push-notification.service';

const MESSAGE = {
  headings: { fr: '+50 points chez Le Bistrot !', en: '+50 points at Le Bistrot!' },
  contents: { fr: 'Votre solde : 150 points.', en: 'Your balance: 150 points.' },
  data: { type: 'points.added', restaurantId: 'resto-1' },
};

describe('NotificationSender', () => {
  let sender: NotificationSender;

  const mockRepo = { createForUsers: jest.fn() };
  const mockPreferencesService = { filterEnabled: jest.fn() };
  const mockPushService = { sendToUsers: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSender,
        { provide: getRepositoryToken(Notification), useValue: mockRepo },
        { provide: NotificationPreferencesService, useValue: mockPreferencesService },
        { provide: PushNotificationService, useValue: mockPushService },
      ],
    }).compile();

    sender = module.get(NotificationSender);
  });

  it('saves a notification for every user and pushes only to those who want it', async () => {
    mockPreferencesService.filterEnabled.mockResolvedValue(['user-1']);

    await sender.send({
      userIds: ['user-1', 'user-2'],
      category: 'points',
      message: MESSAGE,
      restaurantId: 'resto-1',
    });

    expect(mockRepo.createForUsers).toHaveBeenCalledWith(['user-1', 'user-2'], MESSAGE, 'resto-1');
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

    await sender.send({ userIds: ['user-1'], category: 'promotions', message });

    expect(mockRepo.createForUsers).toHaveBeenCalledWith(['user-1'], message, undefined);
    expect(mockPreferencesService.filterEnabled).toHaveBeenCalledWith(
      ['user-1'],
      'promotions',
      undefined,
    );
    expect(mockPushService.sendToUsers).toHaveBeenCalledWith(['user-1'], message);
  });

  it('does nothing without users', async () => {
    await sender.send({ userIds: [], category: 'points', message: MESSAGE });

    expect(mockRepo.createForUsers).not.toHaveBeenCalled();
    expect(mockPushService.sendToUsers).not.toHaveBeenCalled();
  });
});
