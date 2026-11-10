import { Test, TestingModule } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';

import { UserCreatedEvent } from '../../user/events/user-created.event';
import { SubscriptionService } from '../subscription.service';
import { UserCreatedListener } from './user-created.listener';

describe('UserCreatedListener', () => {
  let listener: UserCreatedListener;

  const mockSubscriptionService = { ensureStripeCustomer: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCreatedListener,
        { provide: MikroORM, useValue: { em: { fork: jest.fn() } } },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compile();

    listener = module.get(UserCreatedListener);
  });

  it('creates the Stripe customer of the new user', async () => {
    await listener.handleUserCreated(new UserCreatedEvent('user-1', 'user@test.com'));

    expect(mockSubscriptionService.ensureStripeCustomer).toHaveBeenCalledWith('user-1');
  });

  it('does not throw when Stripe fails', async () => {
    mockSubscriptionService.ensureStripeCustomer.mockRejectedValue(new Error('Stripe down'));

    await expect(
      listener.handleUserCreated(new UserCreatedEvent('user-1', 'user@test.com')),
    ).resolves.toBeUndefined();
  });
});
