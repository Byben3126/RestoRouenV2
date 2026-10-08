import { NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { getRepositoryToken } from '@mikro-orm/nestjs';

import { Promotion, PromotionInternalStatus } from './entities/promotion.entity';
import { PromotionService } from './promotion.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePromotion(overrides: Record<string, unknown> = {}): Partial<Promotion> {
  return {
    id: 'promo-1',
    name: 'Happy Hour',
    internalStatus: PromotionInternalStatus.DRAFT,
    ...overrides,
  };
}

const CREATE_DTO = { name: 'Happy Hour', description: '-50% sur les boissons' };

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('PromotionService', () => {
  let service: PromotionService;
  const jwtService = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '10m' } });

  const mockRepo = {
    findByRestaurant: jest.fn(),
    findAvailableForUser: jest.fn(),
    findAllForUser: jest.fn(),
    findTargetedForUser: jest.fn(),
    findAvailableByIdForUser: jest.fn(),
    createForRestaurant: jest.fn(),
    updateForRestaurant: jest.fn(),
    setStatusForRestaurant: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionService,
        { provide: getRepositoryToken(Promotion), useValue: mockRepo },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(PromotionService);
  });

  // ── getRestaurantPromotions ─────────────────────────────────────────────────

  describe('getRestaurantPromotions', () => {
    it('returns all promotions for the restaurant', async () => {
      const promotions = [makePromotion(), makePromotion({ id: 'promo-2' })];
      mockRepo.findByRestaurant.mockResolvedValue(promotions);

      const result = await service.getRestaurantPromotions('resto-1');

      expect(mockRepo.findByRestaurant).toHaveBeenCalledWith('resto-1');
      expect(result).toBe(promotions);
    });

    it('returns empty array when no promotions exist', async () => {
      mockRepo.findByRestaurant.mockResolvedValue([]);

      const result = await service.getRestaurantPromotions('resto-1');

      expect(result).toHaveLength(0);
    });
  });

  // ── createPromotion ─────────────────────────────────────────────────────────

  describe('getAvailablePromotions', () => {
    it('returns the promotions available to the user', async () => {
      const promotions = [makePromotion()];
      mockRepo.findAvailableForUser.mockResolvedValue(promotions);

      const result = await service.getAvailablePromotions('resto-1', 'user-1');

      expect(mockRepo.findAvailableForUser).toHaveBeenCalledWith('resto-1', 'user-1');
      expect(result).toBe(promotions);
    });

    it('throws NotFoundException when the restaurant does not exist or is inactive', async () => {
      mockRepo.findAvailableForUser.mockResolvedValue(null);

      await expect(service.getAvailablePromotions('resto-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllPromotions', () => {
    it('returns all the paginated promotions of the user', async () => {
      const promotions = [makePromotion()];
      mockRepo.findAllForUser.mockResolvedValue({ items: promotions, total: 1 });

      const result = await service.getAllPromotions('user-1', { page: 2, limit: 10 });

      expect(mockRepo.findAllForUser).toHaveBeenCalledWith('user-1', 2, 10);
      expect(result).toEqual({ items: promotions, total: 1, page: 2, limit: 10 });
    });
  });

  describe('getTargetedPromotions', () => {
    it('returns the paginated targeted promotions of the user', async () => {
      const promotions = [makePromotion()];
      mockRepo.findTargetedForUser.mockResolvedValue({ items: promotions, total: 1 });

      const result = await service.getTargetedPromotions('user-1', { page: 1, limit: 20 });

      expect(mockRepo.findTargetedForUser).toHaveBeenCalledWith('user-1', 1, 20);
      expect(result).toEqual({ items: promotions, total: 1, page: 1, limit: 20 });
    });
  });

  describe('createPromotionToken', () => {
    it('signs the user and the promotion in a 10 minutes token', async () => {
      mockRepo.findAvailableByIdForUser.mockResolvedValue(makePromotion());

      const result = await service.createPromotionToken('user-1', 'promo-1');

      expect(mockRepo.findAvailableByIdForUser).toHaveBeenCalledWith('promo-1', 'user-1');
      const payload = await jwtService.verifyAsync<{ sub: string; promotionId: string }>(
        result.token,
      );
      expect(payload).toMatchObject({ sub: 'user-1', promotionId: 'promo-1' });
      const tenMinutes = 10 * 60 * 1000;
      expect(result.expiresAt.getTime() - Date.now()).toBeGreaterThan(tenMinutes - 5000);
      expect(result.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(tenMinutes);
    });

    it('throws NotFoundException when the promotion is not available for the user', async () => {
      mockRepo.findAvailableByIdForUser.mockResolvedValue(null);

      await expect(service.createPromotionToken('user-1', 'promo-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createPromotion', () => {
    it('creates and returns a new promotion', async () => {
      const promotion = makePromotion();
      mockRepo.createForRestaurant.mockResolvedValue(promotion);

      const result = await service.createPromotion('resto-1', CREATE_DTO as any);

      expect(mockRepo.createForRestaurant).toHaveBeenCalledWith('resto-1', CREATE_DTO);
      expect(result).toBe(promotion);
    });
  });

  // ── updatePromotion ─────────────────────────────────────────────────────────

  describe('updatePromotion', () => {
    it('returns updated promotion', async () => {
      const updated = makePromotion({ name: 'Happy Hour v2' });
      mockRepo.updateForRestaurant.mockResolvedValue(updated);

      const result = await service.updatePromotion('resto-1', 'promo-1', {
        name: 'Happy Hour v2',
      } as any);

      expect(mockRepo.updateForRestaurant).toHaveBeenCalledWith('resto-1', 'promo-1', {
        name: 'Happy Hour v2',
      });
      expect(result).toBe(updated);
    });

    it('returns null when promotion does not exist', async () => {
      mockRepo.updateForRestaurant.mockResolvedValue(null);

      const result = await service.updatePromotion('resto-1', 'promo-x', {} as any);

      expect(result).toBeNull();
    });
  });

  // ── archivePromotion ────────────────────────────────────────────────────────

  describe('archivePromotion', () => {
    it('sets status to ARCHIVED', async () => {
      const promotion = makePromotion({ internalStatus: PromotionInternalStatus.ARCHIVED });
      mockRepo.setStatusForRestaurant.mockResolvedValue(promotion);

      const result = await service.archivePromotion('resto-1', 'promo-1');

      expect(mockRepo.setStatusForRestaurant).toHaveBeenCalledWith(
        'resto-1',
        'promo-1',
        PromotionInternalStatus.ARCHIVED,
      );
      expect(result?.internalStatus).toBe(PromotionInternalStatus.ARCHIVED);
    });

    it('returns null when promotion does not exist', async () => {
      mockRepo.setStatusForRestaurant.mockResolvedValue(null);

      const result = await service.archivePromotion('resto-1', 'promo-x');

      expect(result).toBeNull();
    });
  });

  // ── draftPromotion ──────────────────────────────────────────────────────────

  describe('draftPromotion', () => {
    it('sets status to DRAFT', async () => {
      const promotion = makePromotion({ internalStatus: PromotionInternalStatus.DRAFT });
      mockRepo.setStatusForRestaurant.mockResolvedValue(promotion);

      const result = await service.draftPromotion('resto-1', 'promo-1');

      expect(mockRepo.setStatusForRestaurant).toHaveBeenCalledWith(
        'resto-1',
        'promo-1',
        PromotionInternalStatus.DRAFT,
      );
      expect(result?.internalStatus).toBe(PromotionInternalStatus.DRAFT);
    });
  });

  // ── publishPromotion ────────────────────────────────────────────────────────

  describe('publishPromotion', () => {
    it('sets status to ACTIVE', async () => {
      const promotion = makePromotion({ internalStatus: PromotionInternalStatus.ACTIVE });
      mockRepo.setStatusForRestaurant.mockResolvedValue(promotion);

      const result = await service.publishPromotion('resto-1', 'promo-1');

      expect(mockRepo.setStatusForRestaurant).toHaveBeenCalledWith(
        'resto-1',
        'promo-1',
        PromotionInternalStatus.ACTIVE,
      );
      expect(result?.internalStatus).toBe(PromotionInternalStatus.ACTIVE);
    });

    it('returns null when promotion does not exist', async () => {
      mockRepo.setStatusForRestaurant.mockResolvedValue(null);

      const result = await service.publishPromotion('resto-1', 'promo-x');

      expect(result).toBeNull();
    });
  });
});
