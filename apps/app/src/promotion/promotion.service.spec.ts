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

  const mockRepo = {
    findByRestaurant: jest.fn(),
    createForRestaurant: jest.fn(),
    updateForRestaurant: jest.fn(),
    setStatusForRestaurant: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PromotionService, { provide: getRepositoryToken(Promotion), useValue: mockRepo }],
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
