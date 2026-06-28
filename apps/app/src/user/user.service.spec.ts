import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { getRepositoryToken } from '@mikro-orm/nestjs';

import { AppUser } from './entities/app-user.entity';
import { Language } from './entities/app-user.entity';
import { UserService } from './user.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAppUser(overrides: Record<string, unknown> = {}): Partial<AppUser> {
  return {
    id: 'user-1',
    language: Language.FRENCH,
    linkCode: 'ABCD1234',
    isActive: true,
    isRestaurantOwner: false,
    stripeCustomerId: undefined,
    authUser: {
      id: 'user-1',
      name: 'John Doe',
      email: 'john@example.com',
      emailVerified: true,
      image: undefined,
    } as any,
    person: {
      firstName: 'John',
      lastName: 'Doe',
    } as any,
    ...overrides,
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('UserService', () => {
  let service: UserService;

  const mockRepo = {
    findByAuthUserId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, { provide: getRepositoryToken(AppUser), useValue: mockRepo }],
    }).compile();

    service = module.get(UserService);
  });

  // ── getMe ───────────────────────────────────────────────────────────────────

  describe('getMe', () => {
    it('throws NotFoundException when AppUser does not exist', async () => {
      mockRepo.findByAuthUserId.mockResolvedValue(null);

      await expect(service.getMe('unknown-user')).rejects.toThrow(NotFoundException);
    });

    it('returns a UserDto with correct fields', async () => {
      mockRepo.findByAuthUserId.mockResolvedValue(makeAppUser());

      const dto = await service.getMe('user-1');

      expect(dto.id).toBe('user-1');
      expect(dto.email).toBe('john@example.com');
      expect(dto.firstName).toBe('John');
      expect(dto.lastName).toBe('Doe');
      expect(dto.isRestaurantOwner).toBe(false);
    });

    it('returns isRestaurantOwner as true when user owns a restaurant', async () => {
      mockRepo.findByAuthUserId.mockResolvedValue(makeAppUser({ isRestaurantOwner: true }));

      const dto = await service.getMe('user-1');

      expect(dto.isRestaurantOwner).toBe(true);
    });
  });
});
