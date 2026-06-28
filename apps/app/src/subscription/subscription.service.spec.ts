import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/postgresql';

import { SubscriptionService } from './subscription.service';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
} from './entities/subscription_restaurant.entity';

// ─── Stripe mock ──────────────────────────────────────────────────────────────

const mockStripe = {
  customers: { create: jest.fn() },
  prices: { list: jest.fn() },
  checkout: { sessions: { create: jest.fn() } },
  subscriptions: { retrieve: jest.fn() },
  billingPortal: { sessions: { create: jest.fn() } },
};

jest.mock('stripe', () => jest.fn(() => mockStripe));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAppUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    stripeCustomerId: null,
    authUser: { id: 'user-1', email: 'test@example.com' },
    ...overrides,
  };
}

function makeSubscription(overrides: Record<string, unknown> = {}): Partial<Subscription> {
  return {
    id: 'sub-1',
    stripeSubscriptionId: 'stripe-sub-1',
    plan: SubscriptionPlan.STARTER,
    status: SubscriptionStatus.ACTIVE,
    cancelAtPeriodEnd: false,
    currentPeriodEnd: new Date('2026-07-01'),
    ...overrides,
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  const mockRepo = {
    findOne: jest.fn(),
    findByRestaurantId: jest.fn(),
  };

  const mockEm = {
    findOne: jest.fn(),
    create: jest.fn(),
    getReference: jest.fn(),
    flush: jest.fn(),
    assign: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: getRepositoryToken(Subscription), useValue: mockRepo },
        { provide: EntityManager, useValue: mockEm },
      ],
    }).compile();

    service = module.get(SubscriptionService);
  });

  // ── ensureStripeCustomer ────────────────────────────────────────────────────

  describe('ensureStripeCustomer', () => {
    it('throws NotFoundException when AppUser does not exist', async () => {
      mockEm.findOne.mockResolvedValue(null);

      await expect(service.ensureStripeCustomer('user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns existing stripeCustomerId without calling Stripe', async () => {
      mockEm.findOne.mockResolvedValue(makeAppUser({ stripeCustomerId: 'cus_existing' }));

      const result = await service.ensureStripeCustomer('user-1');

      expect(result).toBe('cus_existing');
      expect(mockStripe.customers.create).not.toHaveBeenCalled();
    });

    it('creates a Stripe customer and persists the ID when none exists', async () => {
      const appUser = makeAppUser();
      mockEm.findOne.mockResolvedValue(appUser);
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' });

      const result = await service.ensureStripeCustomer('user-1');

      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: { userId: 'user-1' },
      });
      expect(appUser.stripeCustomerId).toBe('cus_new');
      expect(mockEm.flush).toHaveBeenCalled();
      expect(result).toBe('cus_new');
    });
  });

  // ── createCheckoutSession ───────────────────────────────────────────────────

  describe('createCheckoutSession', () => {
    const restaurantId = 'resto-1';
    const plan = SubscriptionPlan.STARTER;

    beforeEach(() => {
      mockEm.findOne.mockResolvedValue(makeAppUser({ stripeCustomerId: 'cus_123' }));
      mockStripe.prices.list.mockResolvedValue({ data: [{ id: 'price_abc' }] });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/session',
      });
      process.env.STRIPE_PRODUCT_STARTER = 'prod_starter';
      process.env.FRONTEND_URL = 'http://localhost:3008';
    });

    it('throws ConflictException when an active subscription already exists', async () => {
      mockRepo.findByRestaurantId.mockResolvedValue(
        makeSubscription({ status: SubscriptionStatus.ACTIVE }),
      );

      await expect(
        service.createCheckoutSession('user-1', restaurantId, plan),
      ).rejects.toThrow(ConflictException);

      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a trialing subscription already exists', async () => {
      mockRepo.findByRestaurantId.mockResolvedValue(
        makeSubscription({ status: SubscriptionStatus.TRIALING }),
      );

      await expect(
        service.createCheckoutSession('user-1', restaurantId, plan),
      ).rejects.toThrow(ConflictException);
    });

    it('creates checkout session and returns URL when no active subscription', async () => {
      mockRepo.findByRestaurantId.mockResolvedValue(null);

      const url = await service.createCheckoutSession('user-1', restaurantId, plan);

      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_123',
          mode: 'subscription',
          metadata: { restaurantId, plan },
        }),
      );
      expect(url).toBe('https://checkout.stripe.com/session');
    });

    it('allows checkout when existing subscription is canceled', async () => {
      mockRepo.findByRestaurantId.mockResolvedValue(
        makeSubscription({ status: SubscriptionStatus.CANCELED }),
      );

      const url = await service.createCheckoutSession('user-1', restaurantId, plan);

      expect(url).toBe('https://checkout.stripe.com/session');
    });
  });

  // ── handleInvoicePaymentSucceeded ───────────────────────────────────────────

  describe('handleInvoicePaymentSucceeded', () => {
    const periodEnd = 1785075012;

    function makeInvoice(overrides: Record<string, unknown> = {}) {
      return {
        customer: 'cus_123',
        parent: { subscription_details: { subscription: 'stripe-sub-1' } },
        lines: { data: [{ period: { end: periodEnd } }] },
        ...overrides,
      } as any;
    }

    it('returns early when invoice has no subscription ID', async () => {
      const invoice = makeInvoice({ parent: { subscription_details: { subscription: null } } });

      await service.handleInvoicePaymentSucceeded(invoice);

      expect(mockRepo.findOne).not.toHaveBeenCalled();
      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it('updates currentPeriodEnd when subscription found by stripeSubscriptionId', async () => {
      const sub = makeSubscription({ stripeSubscriptionId: 'stripe-sub-1' });
      mockRepo.findOne.mockResolvedValue(sub);

      await service.handleInvoicePaymentSucceeded(makeInvoice());

      expect(sub.currentPeriodEnd).toEqual(new Date(periodEnd * 1000));
      expect(mockEm.flush).toHaveBeenCalled();
    });

    it('finds subscription via customer fallback and sets stripeSubscriptionId', async () => {
      mockRepo.findOne.mockResolvedValue(null); // not found by stripeSubscriptionId

      const appUser = makeAppUser({ stripeCustomerId: 'cus_123' });
      const restaurant = { id: 'resto-1' };
      const sub = makeSubscription({ stripeSubscriptionId: undefined });

      mockEm.findOne
        .mockResolvedValueOnce(appUser)     // AppUser lookup
        .mockResolvedValueOnce(restaurant); // Restaurant lookup
      mockRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(sub);

      await service.handleInvoicePaymentSucceeded(makeInvoice());

      expect(sub.stripeSubscriptionId).toBe('stripe-sub-1');
      expect(sub.currentPeriodEnd).toEqual(new Date(periodEnd * 1000));
    });
  });

  // ── handleSubscriptionUpdated ───────────────────────────────────────────────

  describe('handleSubscriptionUpdated', () => {
    it('returns early when subscription not found in DB', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await service.handleSubscriptionUpdated({ id: 'stripe-sub-x', status: 'active' } as any);

      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it('updates status and cancelAtPeriodEnd', async () => {
      const sub = makeSubscription({ status: SubscriptionStatus.ACTIVE });
      mockRepo.findOne.mockResolvedValue(sub);

      const stripeSubscription = {
        id: 'stripe-sub-1',
        status: 'past_due',
        cancel_at_period_end: true,
        current_period_end: 1785075012,
      } as any;

      await service.handleSubscriptionUpdated(stripeSubscription);

      expect(sub.status).toBe(SubscriptionStatus.PAST_DUE);
      expect(sub.cancelAtPeriodEnd).toBe(true);
      expect(mockEm.flush).toHaveBeenCalled();
    });
  });

  // ── handleSubscriptionDeleted ───────────────────────────────────────────────

  describe('handleSubscriptionDeleted', () => {
    it('returns early when subscription not found in DB', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await service.handleSubscriptionDeleted({ id: 'stripe-sub-x' } as any);

      expect(mockEm.flush).not.toHaveBeenCalled();
    });

    it('marks subscription as CANCELED', async () => {
      const sub = makeSubscription({ status: SubscriptionStatus.ACTIVE });
      mockRepo.findOne.mockResolvedValue(sub);

      await service.handleSubscriptionDeleted({ id: 'stripe-sub-1' } as any);

      expect(sub.status).toBe(SubscriptionStatus.CANCELED);
      expect(mockEm.flush).toHaveBeenCalled();
    });
  });

  // ── createPortalSession ─────────────────────────────────────────────────────

  describe('createPortalSession', () => {
    it('returns portal URL', async () => {
      mockEm.findOne.mockResolvedValue(makeAppUser({ stripeCustomerId: 'cus_123' }));
      mockStripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/portal',
      });
      process.env.FRONTEND_URL = 'http://localhost:3008';

      const url = await service.createPortalSession('user-1');

      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'http://localhost:3008/dashboard',
      });
      expect(url).toBe('https://billing.stripe.com/portal');
    });
  });
});
