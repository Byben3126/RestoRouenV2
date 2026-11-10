import { Test, TestingModule } from '@nestjs/testing';

import { EmailService } from './email.service';
import { EMAIL_VERIFICATION_TEMPLATE, ONESIGNAL_CLIENT } from './onesignal.constants';

describe('EmailService', () => {
  const mockClient = { createNotificationWithRetry: jest.fn() };

  async function createService(client: unknown) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService, { provide: ONESIGNAL_CLIENT, useValue: client }],
    }).compile();
    return module.get(EmailService);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ONESIGNAL_APP_ID = 'app-1';
  });

  it('sends the OneSignal template to the address, with its variables', async () => {
    mockClient.createNotificationWithRetry.mockResolvedValue({ response: { id: 'notif-1' } });
    const service = await createService(mockClient);

    await service.sendTemplate('jean@x.fr', EMAIL_VERIFICATION_TEMPLATE, { code: '12345' });

    expect(mockClient.createNotificationWithRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        app_id: 'app-1',
        include_email_tokens: ['jean@x.fr'],
        template_id: '9cdc030e-f51c-4f98-89ec-d86a6f737913',
        email_subject: 'Vérification de votre Email',
        email_from_name: 'Resto Rouen',
        custom_data: { code: '12345' },
      }),
    );
  });

  it('sends nothing when OneSignal is not configured', async () => {
    const service = await createService(null);

    await expect(
      service.sendTemplate('jean@x.fr', EMAIL_VERIFICATION_TEMPLATE, { code: '12345' }),
    ).resolves.toBeUndefined();
  });

  it('does not throw when OneSignal fails: the sign-up does not wait for the email', async () => {
    mockClient.createNotificationWithRetry.mockRejectedValue(new Error('OneSignal down'));
    const service = await createService(mockClient);

    await expect(
      service.sendTemplate('jean@x.fr', EMAIL_VERIFICATION_TEMPLATE, { code: '12345' }),
    ).resolves.toBeUndefined();
  });
});
