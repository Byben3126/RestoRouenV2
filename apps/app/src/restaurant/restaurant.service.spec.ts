import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@mikro-orm/nestjs';

import { RestaurantService } from './restaurant.service';
import { Restaurant } from './entities/restaurant.entity';
import { SubscriptionService } from '../subscription/subscription.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRestaurant(overrides: Record<string, unknown> = {}): Partial<Restaurant> {
  return {
    id: 'resto-1',
    name: 'Le Bistrot',
    latitude: 49.44,
    longitude: 1.09,
    mediaIds: [],
    ...overrides,
  };
}

const CREATE_DTO = { name: 'Le Bistrot', latitude: 49.44, longitude: 1.09 };

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('RestaurantService', () => {
  let service: RestaurantService;

  const mockRepo = {
    findOne: jest.fn(),
    findByUserId: jest.fn(),
    createOne: jest.fn(),
    loadWithMedias: jest.fn(),
    updateForUser: jest.fn(),
  };

  const mockSubscriptionService = {
    ensureStripeCustomer: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantService,
        { provide: getRepositoryToken(Restaurant), useValue: mockRepo },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
      ],
    }).compile();

    service = module.get(RestaurantService);
  });

  // ── createMyRestaurant ──────────────────────────────────────────────────────

  describe('createMyRestaurant', () => {
    it('throws ConflictException when a restaurant already exists for the user', async () => {
      mockRepo.findOne.mockResolvedValue(makeRestaurant());

      await expect(service.createMyRestaurant('user-1', CREATE_DTO)).rejects.toThrow(
        ConflictException,
      );

      expect(mockSubscriptionService.ensureStripeCustomer).not.toHaveBeenCalled();
      expect(mockRepo.createOne).not.toHaveBeenCalled();
    });

    it('calls ensureStripeCustomer before creating the restaurant', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockSubscriptionService.ensureStripeCustomer.mockResolvedValue('cus_123');
      const restaurant = makeRestaurant();
      mockRepo.createOne.mockResolvedValue(restaurant);
      mockRepo.loadWithMedias.mockResolvedValue(restaurant);

      await service.createMyRestaurant('user-1', CREATE_DTO);

      const callOrder = [
        mockSubscriptionService.ensureStripeCustomer.mock.invocationCallOrder[0],
        mockRepo.createOne.mock.invocationCallOrder[0],
      ];
      expect(callOrder[0]).toBeLessThan(callOrder[1]);
    });

    it('creates and returns the restaurant with medias loaded', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockSubscriptionService.ensureStripeCustomer.mockResolvedValue('cus_123');
      const restaurant = makeRestaurant({ name: 'Le Bistrot' });
      mockRepo.createOne.mockResolvedValue(restaurant);
      mockRepo.loadWithMedias.mockResolvedValue(restaurant);

      const result = await service.createMyRestaurant('user-1', CREATE_DTO);

      expect(mockRepo.createOne).toHaveBeenCalledWith('user-1', CREATE_DTO);
      expect(mockRepo.loadWithMedias).toHaveBeenCalledWith(restaurant);
      expect(result).toBe(restaurant);
    });

    it('propagates error from ensureStripeCustomer', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockSubscriptionService.ensureStripeCustomer.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(service.createMyRestaurant('user-1', CREATE_DTO)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockRepo.createOne).not.toHaveBeenCalled();
    });
  });

  // ── getMyRestaurant ─────────────────────────────────────────────────────────

  describe('getMyRestaurant', () => {
    it('throws NotFoundException when restaurant does not exist', async () => {
      mockRepo.findByUserId.mockResolvedValue(null);

      await expect(service.getMyRestaurant('user-1')).rejects.toThrow(NotFoundException);
    });

    it('returns the restaurant when found', async () => {
      const restaurant = makeRestaurant();
      mockRepo.findByUserId.mockResolvedValue(restaurant);

      const result = await service.getMyRestaurant('user-1');

      expect(result).toBe(restaurant);
    });
  });

  // ── updateMyRestaurant ──────────────────────────────────────────────────────

  describe('updateMyRestaurant', () => {
    it('throws NotFoundException when restaurant does not exist', async () => {
      mockRepo.updateForUser.mockResolvedValue(null);

      await expect(service.updateMyRestaurant('user-1', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns updated restaurant', async () => {
      const updated = makeRestaurant({ name: 'New Name' });
      mockRepo.updateForUser.mockResolvedValue(updated);

      const result = await service.updateMyRestaurant('user-1', { name: 'New Name' });

      expect(result).toBe(updated);
    });
  });
});
