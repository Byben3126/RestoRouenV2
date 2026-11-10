import { Test, TestingModule } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';
import { Job } from 'bullmq';

import { NotificationSender, NotificationToSend } from '../notification.sender';
import { SEND_NOTIFICATION_JOB } from './notification.constants';
import { NotificationProcessor } from './notification.processor';

const NOTIFICATION: NotificationToSend = {
  userIds: ['user-1', 'user-2'],
  category: 'points',
  message: { headings: { en: '+50 points at Le Bistrot!' }, contents: { en: 'Balance: 150' } },
  restaurantId: 'resto-1',
};

const job = { name: SEND_NOTIFICATION_JOB, data: NOTIFICATION } as Job<NotificationToSend>;

describe('NotificationProcessor', () => {
  let processor: NotificationProcessor;

  const mockSender = { send: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationProcessor,
        { provide: MikroORM, useValue: { em: { fork: jest.fn() } } },
        { provide: NotificationSender, useValue: mockSender },
      ],
    }).compile();

    processor = module.get(NotificationProcessor);
  });

  it('sends the notification of the job', async () => {
    await processor.process(job);

    expect(mockSender.send).toHaveBeenCalledWith(NOTIFICATION);
  });

  it('fails the job when the sending fails, so that BullMQ retries it', async () => {
    mockSender.send.mockRejectedValue(new Error('Database down'));

    await expect(processor.process(job)).rejects.toThrow('Database down');
  });
});
