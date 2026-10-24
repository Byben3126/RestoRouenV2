import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { getRepositoryToken } from '@mikro-orm/nestjs';

import { NotificationPreferences } from './entities/notification-preferences.entity';
import { NotificationPreferencesService } from './notification-preferences.service';

const RESTAURANT = { id: 'resto-1', name: 'Le Bistrot' };

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;

  const mockRepo = {
    findByUser: jest.fn(),
    updateForUser: jest.fn(),
    setRestaurantEnabled: jest.fn(),
    isRestaurantEnabled: jest.fn(),
    findUsersWithCategoryDisabled: jest.fn(),
    findUsersWithRestaurantEnabled: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        { provide: getRepositoryToken(NotificationPreferences), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(NotificationPreferencesService);
  });

  describe('getPreferences', () => {
    it('enables every category for a user who never changed anything', async () => {
      mockRepo.findByUser.mockResolvedValue(null);

      const result = await service.getPreferences('user-1');

      expect(result).toMatchObject({
        points: true,
        rewards: true,
        promotions: true,
        ratings: true,
      });
    });

    it("returns the user's saved preferences", async () => {
      const preferences = { points: true, rewards: true, promotions: false, ratings: false };
      mockRepo.findByUser.mockResolvedValue(preferences);

      expect(await service.getPreferences('user-1')).toBe(preferences);
      expect(mockRepo.findByUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('updatePreferences', () => {
    it('only passes the categories sent by the user', async () => {
      const updated = { points: true, rewards: true, promotions: false, ratings: true };
      mockRepo.updateForUser.mockResolvedValue(updated);

      const result = await service.updatePreferences('user-1', { promotions: false });

      expect(mockRepo.updateForUser).toHaveBeenCalledWith('user-1', { promotions: false });
      expect(result).toBe(updated);
    });
  });

  describe('isEnabled', () => {
    it('is enabled when the user never changed anything', async () => {
      mockRepo.findByUser.mockResolvedValue(null);
      mockRepo.isRestaurantEnabled.mockResolvedValue(true);

      const result = await service.isEnabled('user-1', 'points', 'resto-1');

      expect(mockRepo.isRestaurantEnabled).toHaveBeenCalledWith('user-1', 'resto-1');
      expect(result).toBe(true);
    });

    it('is disabled without querying the restaurant when the category is off', async () => {
      const preferences = Object.assign(new NotificationPreferences(), { points: false });
      mockRepo.findByUser.mockResolvedValue(preferences);

      const result = await service.isEnabled('user-1', 'points', 'resto-1');

      expect(result).toBe(false);
      expect(mockRepo.isRestaurantEnabled).not.toHaveBeenCalled();
    });

    it('is disabled when the user turned off this restaurant', async () => {
      mockRepo.findByUser.mockResolvedValue(null);
      mockRepo.isRestaurantEnabled.mockResolvedValue(false);

      const result = await service.isEnabled('user-1', 'points', 'resto-1');

      expect(result).toBe(false);
    });

    it('only checks the category for an app notification, without restaurant', async () => {
      mockRepo.findByUser.mockResolvedValue(null);

      const result = await service.isEnabled('user-1', 'promotions');

      expect(result).toBe(true);
      expect(mockRepo.isRestaurantEnabled).not.toHaveBeenCalled();
    });
  });

  describe('filterEnabled', () => {
    it('keeps the users who did not turn off the category nor the restaurant', async () => {
      mockRepo.findUsersWithCategoryDisabled.mockResolvedValue(['user-2']);
      mockRepo.findUsersWithRestaurantEnabled.mockResolvedValue(['user-1']);

      const result = await service.filterEnabled(
        ['user-1', 'user-2', 'user-3'],
        'points',
        'resto-1',
      );

      expect(mockRepo.findUsersWithCategoryDisabled).toHaveBeenCalledWith(
        ['user-1', 'user-2', 'user-3'],
        'points',
      );
      // user-2 a coupé les points : inutile de vérifier le restaurant pour lui
      expect(mockRepo.findUsersWithRestaurantEnabled).toHaveBeenCalledWith(
        ['user-1', 'user-3'],
        'resto-1',
      );
      expect(result).toEqual(['user-1']);
    });

    it('does not query the restaurant when every user turned off the category', async () => {
      mockRepo.findUsersWithCategoryDisabled.mockResolvedValue(['user-1']);

      const result = await service.filterEnabled(['user-1'], 'points', 'resto-1');

      expect(result).toEqual([]);
      expect(mockRepo.findUsersWithRestaurantEnabled).not.toHaveBeenCalled();
    });

    it('only checks the category for an app notification, without restaurant', async () => {
      mockRepo.findUsersWithCategoryDisabled.mockResolvedValue(['user-2']);

      const result = await service.filterEnabled(['user-1', 'user-2'], 'promotions');

      expect(result).toEqual(['user-1']);
      expect(mockRepo.findUsersWithRestaurantEnabled).not.toHaveBeenCalled();
    });
  });

  describe('setRestaurantEnabled', () => {
    it('turns off every notification of the restaurant', async () => {
      mockRepo.setRestaurantEnabled.mockResolvedValue({
        restaurant: RESTAURANT,
        notificationsEnabled: false,
      });

      const result = await service.setRestaurantEnabled('user-1', 'resto-1', false);

      expect(mockRepo.setRestaurantEnabled).toHaveBeenCalledWith('user-1', 'resto-1', false);
      expect(result).toEqual({ restaurant: RESTAURANT, enabled: false });
    });

    it('throws NotFoundException for a restaurant the user is not a customer of', async () => {
      mockRepo.setRestaurantEnabled.mockResolvedValue(null);

      await expect(service.setRestaurantEnabled('user-1', 'resto-x', false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
