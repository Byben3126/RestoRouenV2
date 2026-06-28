import { Test, TestingModule } from '@nestjs/testing';

import { getRepositoryToken } from '@mikro-orm/nestjs';

import { CustomerService } from './customer.service';
import { Customer } from './entities/customer.entity';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCustomer(overrides: Record<string, unknown> = {}): Partial<Customer> {
  return {
    id: 'customer-1',
    points: 0,
    totalPointsGained: 0,
    ...overrides,
  };
}

function makePaginated(items: Partial<Customer>[] = []) {
  return { items, total: items.length, page: 1, limit: 10 };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('CustomerService', () => {
  let service: CustomerService;

  const mockRepo = {
    findPaginated: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CustomerService, { provide: getRepositoryToken(Customer), useValue: mockRepo }],
    }).compile();

    service = module.get(CustomerService);
  });

  // ── getRestaurantCustomers ──────────────────────────────────────────────────

  describe('getRestaurantCustomers', () => {
    const query = { page: 1, limit: 10 };

    it('returns paginated customers for the restaurant', async () => {
      const paginated = makePaginated([makeCustomer(), makeCustomer({ id: 'customer-2' })]);
      mockRepo.findPaginated.mockResolvedValue(paginated);

      const result = await service.getRestaurantCustomers('resto-1', query as any);

      expect(mockRepo.findPaginated).toHaveBeenCalledWith('resto-1', query);
      expect(result).toBe(paginated);
    });

    it('returns empty list when restaurant has no customers', async () => {
      const paginated = makePaginated([]);
      mockRepo.findPaginated.mockResolvedValue(paginated);

      const result = await service.getRestaurantCustomers('resto-1', query as any);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('passes query params to repository', async () => {
      const customQuery = { page: 2, limit: 5, search: 'john' };
      mockRepo.findPaginated.mockResolvedValue(makePaginated([]));

      await service.getRestaurantCustomers('resto-1', customQuery as any);

      expect(mockRepo.findPaginated).toHaveBeenCalledWith('resto-1', customQuery);
    });
  });
});
