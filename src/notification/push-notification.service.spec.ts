import { Test, TestingModule } from '@nestjs/testing';

import {
  ONESIGNAL_CLIENT,
  PushMessage,
  PushNotificationService,
} from './push-notification.service';

const MESSAGE: PushMessage = {
  headings: { en: '+50 points at Le Bistrot!', fr: '+50 points chez Le Bistrot !' },
  contents: { en: 'Your balance: 150 points.', fr: 'Votre solde : 150 points.' },
  data: { type: 'points.added', restaurantId: 'resto-1' },
};

describe('PushNotificationService', () => {
  const mockClient = { createNotificationWithRetry: jest.fn() };

  async function createService(client: unknown) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PushNotificationService, { provide: ONESIGNAL_CLIENT, useValue: client }],
    }).compile();
    return module.get(PushNotificationService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ONESIGNAL_APP_ID = 'app-1';
  });

  it('sends the push to the devices of the users, by their external id', async () => {
    mockClient.createNotificationWithRetry.mockResolvedValue({ response: { id: 'notif-1' } });
    const service = await createService(mockClient);

    await service.sendToUsers(['user-1'], MESSAGE);

    expect(mockClient.createNotificationWithRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        app_id: 'app-1',
        target_channel: 'push',
        include_aliases: { external_id: ['user-1'] },
        headings: MESSAGE.headings,
        contents: MESSAGE.contents,
        data: MESSAGE.data,
      }),
    );
  });

  it('sends nothing when there is no user, never to every user', async () => {
    const service = await createService(mockClient);

    await service.sendToUsers([], MESSAGE);

    expect(mockClient.createNotificationWithRetry).not.toHaveBeenCalled();
  });

  it('sends nothing when OneSignal is not configured', async () => {
    const service = await createService(null);

    await expect(service.sendToUsers(['user-1'], MESSAGE)).resolves.toBeUndefined();
  });

  it('does not throw when OneSignal could not deliver the push', async () => {
    mockClient.createNotificationWithRetry.mockResolvedValue({
      response: { id: '', errors: ['All included players are not subscribed'] },
    });
    const service = await createService(mockClient);

    await expect(service.sendToUsers(['user-1'], MESSAGE)).resolves.toBeUndefined();
  });
});
