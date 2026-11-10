import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { UniqueConstraintViolationException } from '@mikro-orm/core';
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
  const jwtService = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '10m' } });

  const mockRepo = {
    findByRestaurant: jest.fn(),
    findActiveByRestaurant: jest.fn(),
    createForRestaurant: jest.fn(),
    updateForRestaurant: jest.fn(),
    setStatusForRestaurant: jest.fn(),
    findActiveById: jest.fn(),
    canRedeem: jest.fn(),
    redeem: jest.fn(),
  };
  const mockEventEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardService,
        { provide: getRepositoryToken(Reward), useValue: mockRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(RewardService);
  });

  // ── getActiveRewards ────────────────────────────────────────────────────────

  describe('getActiveRewards', () => {
    it('returns the active rewards of the restaurant', async () => {
      const rewards = [makeReward({ status: RewardStatus.ACTIVE })];
      mockRepo.findActiveByRestaurant.mockResolvedValue(rewards);

      const result = await service.getActiveRewards('resto-1');

      expect(mockRepo.findActiveByRestaurant).toHaveBeenCalledWith('resto-1');
      expect(result).toBe(rewards);
    });

    it('throws NotFoundException when the restaurant does not exist or is inactive', async () => {
      mockRepo.findActiveByRestaurant.mockResolvedValue(null);

      await expect(service.getActiveRewards('resto-1')).rejects.toThrow(NotFoundException);
    });
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

  // ── createRewardToken ───────────────────────────────────────────────────────

  describe('createRewardToken', () => {
    const reward = makeReward({ status: RewardStatus.ACTIVE });

    it('signs the user, the reward and a unique token id in a 10 minutes token', async () => {
      mockRepo.findActiveById.mockResolvedValue(reward);
      mockRepo.canRedeem.mockResolvedValue(true);

      const first = await service.createRewardToken('user-1', 'reward-1');
      const second = await service.createRewardToken('user-1', 'reward-1');

      expect(mockRepo.canRedeem).toHaveBeenCalledWith(reward, 'user-1');
      const payload = await jwtService.verifyAsync<{ sub: string; rewardId: string; jti: string }>(
        first.token,
      );
      expect(payload).toMatchObject({ sub: 'user-1', rewardId: 'reward-1' });
      expect(payload.jti).toEqual(expect.any(String));
      expect(jwtService.decode<{ jti: string }>(second.token).jti).not.toBe(payload.jti);
      const tenMinutes = 10 * 60 * 1000;
      expect(first.expiresAt.getTime() - Date.now()).toBeGreaterThan(tenMinutes - 5000);
    });

    it('throws NotFoundException when the reward is not active', async () => {
      mockRepo.findActiveById.mockResolvedValue(null);

      await expect(service.createRewardToken('user-1', 'reward-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the user has not enough points', async () => {
      mockRepo.findActiveById.mockResolvedValue(reward);
      mockRepo.canRedeem.mockResolvedValue(false);

      await expect(service.createRewardToken('user-1', 'reward-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ── useReward ───────────────────────────────────────────────────────────────

  describe('useReward', () => {
    const reward = makeReward({ status: RewardStatus.ACTIVE, restaurant: { id: 'resto-1' } });
    const tokenFor = (jti = 'token-1') =>
      jwtService.signAsync({ sub: 'user-1', rewardId: 'reward-1', jti });

    it('redeems the reward of the token for its user', async () => {
      mockRepo.findActiveById.mockResolvedValue(reward);
      mockRepo.redeem.mockResolvedValue(true);

      const result = await service.useReward('resto-1', await tokenFor());

      expect(mockRepo.findActiveById).toHaveBeenCalledWith('reward-1');
      expect(mockRepo.redeem).toHaveBeenCalledWith(reward, 'user-1', 'token-1');
      expect(result).toBe(reward);
    });

    it('notifies that the user has used the reward', async () => {
      mockRepo.findActiveById.mockResolvedValue(reward);
      mockRepo.redeem.mockResolvedValue(true);

      await service.useReward('resto-1', await tokenFor());

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('reward.used', {
        userId: 'user-1',
        restaurantId: 'resto-1',
        rewardId: 'reward-1',
        pointsSpent: 100,
      });
    });

    it('throws BadRequestException when the token is not signed by the server', async () => {
      const forged = await new JwtService({ secret: 'other-secret' }).signAsync({
        sub: 'user-1',
        rewardId: 'reward-1',
        jti: 'token-1',
      });

      await expect(service.useReward('resto-1', forged)).rejects.toThrow(BadRequestException);
      expect(mockRepo.redeem).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the token has expired', async () => {
      const expired = await jwtService.signAsync(
        { sub: 'user-1', rewardId: 'reward-1', jti: 'token-1' },
        { expiresIn: '-1s' },
      );

      await expect(service.useReward('resto-1', expired)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when the reward is no longer active', async () => {
      mockRepo.findActiveById.mockResolvedValue(null);

      await expect(service.useReward('resto-1', await tokenFor())).rejects.toThrow(
        ConflictException,
      );
      expect(mockRepo.redeem).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the reward belongs to another restaurant', async () => {
      mockRepo.findActiveById.mockResolvedValue(reward);

      await expect(service.useReward('resto-2', await tokenFor())).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockRepo.redeem).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the user has no longer enough points', async () => {
      mockRepo.findActiveById.mockResolvedValue(reward);
      mockRepo.redeem.mockResolvedValue(false);

      await expect(service.useReward('resto-1', await tokenFor())).rejects.toThrow(
        ConflictException,
      );
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the token has already been used', async () => {
      mockRepo.findActiveById.mockResolvedValue(reward);
      mockRepo.redeem.mockRejectedValue(
        new UniqueConstraintViolationException(new Error('duplicate key')),
      );

      await expect(service.useReward('resto-1', await tokenFor())).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
