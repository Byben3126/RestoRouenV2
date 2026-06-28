import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { getRepositoryToken } from '@mikro-orm/nestjs';

import { Reward, RewardStatus } from './entities/reward.entity';
import { RewardService } from './reward.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReward(overrides: Record<string, unknown> = {}): Partial<Reward> {
  return {
    id: 'reward-1',
    name: 'Café offert',
    pointRequired: 100,
    status: RewardStatus.DRAFT,
    ...overrides,
  };
}

const CREATE_DTO = { name: 'Café offert', pointRequired: 100 };

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('RewardService', () => {
  let service: RewardService;

  const mockRepo = {
    findByRestaurant: jest.fn(),
    createForRestaurant: jest.fn(),
    updateForRestaurant: jest.fn(),
    setStatusForRestaurant: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RewardService, { provide: getRepositoryToken(Reward), useValue: mockRepo }],
    }).compile();

    service = module.get(RewardService);
  });

  // ── getRestaurantRewards ────────────────────────────────────────────────────

  describe('getRestaurantRewards', () => {
    it('returns all rewards for the restaurant', async () => {
      const rewards = [makeReward(), makeReward({ id: 'reward-2' })];
      mockRepo.findByRestaurant.mockResolvedValue(rewards);

      const result = await service.getRestaurantRewards('resto-1');

      expect(mockRepo.findByRestaurant).toHaveBeenCalledWith('resto-1');
      expect(result).toBe(rewards);
    });

    it('returns empty array when no rewards exist', async () => {
      mockRepo.findByRestaurant.mockResolvedValue([]);

      const result = await service.getRestaurantRewards('resto-1');

      expect(result).toHaveLength(0);
    });
  });

  // ── createReward ────────────────────────────────────────────────────────────

  describe('createReward', () => {
    it('creates and returns a new reward', async () => {
      const reward = makeReward();
      mockRepo.createForRestaurant.mockResolvedValue(reward);

      const result = await service.createReward('resto-1', CREATE_DTO as any);

      expect(mockRepo.createForRestaurant).toHaveBeenCalledWith('resto-1', CREATE_DTO);
      expect(result).toBe(reward);
    });
  });

  // ── updateReward ────────────────────────────────────────────────────────────

  describe('updateReward', () => {
    it('throws NotFoundException when reward does not exist', async () => {
      mockRepo.updateForRestaurant.mockResolvedValue(null);

      await expect(
        service.updateReward('resto-1', 'reward-x', { name: 'New Name' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns updated reward', async () => {
      const updated = makeReward({ name: 'New Name' });
      mockRepo.updateForRestaurant.mockResolvedValue(updated);

      const result = await service.updateReward('resto-1', 'reward-1', { name: 'New Name' } as any);

      expect(result).toBe(updated);
    });
  });

  // ── setStatus ───────────────────────────────────────────────────────────────

  describe('setStatus', () => {
    it('throws NotFoundException when reward does not exist', async () => {
      mockRepo.setStatusForRestaurant.mockResolvedValue(null);

      await expect(service.setStatus('resto-1', 'reward-x', RewardStatus.ACTIVE)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('publishes a reward (sets status to ACTIVE)', async () => {
      const reward = makeReward({ status: RewardStatus.ACTIVE });
      mockRepo.setStatusForRestaurant.mockResolvedValue(reward);

      const result = await service.setStatus('resto-1', 'reward-1', RewardStatus.ACTIVE);

      expect(mockRepo.setStatusForRestaurant).toHaveBeenCalledWith(
        'resto-1',
        'reward-1',
        RewardStatus.ACTIVE,
      );
      expect(result.status).toBe(RewardStatus.ACTIVE);
    });

    it('archives a reward (sets status to ARCHIVED)', async () => {
      const reward = makeReward({ status: RewardStatus.ARCHIVED });
      mockRepo.setStatusForRestaurant.mockResolvedValue(reward);

      const result = await service.setStatus('resto-1', 'reward-1', RewardStatus.ARCHIVED);

      expect(result.status).toBe(RewardStatus.ARCHIVED);
    });

    it('sets reward back to draft', async () => {
      const reward = makeReward({ status: RewardStatus.DRAFT });
      mockRepo.setStatusForRestaurant.mockResolvedValue(reward);

      const result = await service.setStatus('resto-1', 'reward-1', RewardStatus.DRAFT);

      expect(result.status).toBe(RewardStatus.DRAFT);
    });
  });
});
