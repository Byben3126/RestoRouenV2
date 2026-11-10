/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';

import { getRepositoryToken } from '@mikro-orm/nestjs';

import { AppUser } from './entities/app-user.entity';
import { Language } from './entities/app-user.entity';
import { USER_DELETED_EVENT, UserDeletedEvent } from './events/user-deleted.event';
import { PersonNotFoundException } from './exceptions/person-not-found.exception';
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
    updateProfile: jest.fn(),
    anonymize: jest.fn(),
    hasActivity: jest.fn(),
  };
  const mockEventEmitter = { emit: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(AppUser), useValue: mockRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
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

  // ── updateMe ────────────────────────────────────────────────────────────────

  describe('updateMe', () => {
    it('throws NotFoundException when AppUser does not exist', async () => {
      mockRepo.findByAuthUserId.mockResolvedValue(null);

      await expect(service.updateMe('unknown-user', { city: 'Rouen' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockRepo.updateProfile).not.toHaveBeenCalled();
    });

    it('throws PersonNotFoundException without creating the missing Person', async () => {
      mockRepo.findByAuthUserId.mockResolvedValue(makeAppUser({ person: undefined }));

      await expect(service.updateMe('user-1', { city: 'Rouen' })).rejects.toThrow(
        PersonNotFoundException,
      );
      expect(mockRepo.updateProfile).not.toHaveBeenCalled();
    });

    it('splits the fields between AppUser and Person, and returns the updated UserDto', async () => {
      const appUser = makeAppUser();
      mockRepo.findByAuthUserId.mockResolvedValue(appUser);
      mockRepo.updateProfile.mockResolvedValue(
        makeAppUser({ person: { firstName: 'John', lastName: 'Doe', city: 'Rouen' } }),
      );

      const dto = await service.updateMe('user-1', { language: Language.ENGLISH, city: 'Rouen' });

      expect(mockRepo.updateProfile).toHaveBeenCalledWith(
        appUser,
        appUser.person,
        { language: Language.ENGLISH },
        { city: 'Rouen' },
      );
      expect(dto.city).toBe('Rouen');
    });
  });

  // ── getEnrichmentStatus ─────────────────────────────────────────────────────

  describe('getEnrichmentStatus', () => {
    const completePerson = {
      firstName: 'John',
      gender: 'male',
      city: 'Rouen',
      dateOfBirth: new Date('1990-05-12'),
      country: 'France',
    };

    it('is false when the profile is complete, without looking at the activity', async () => {
      mockRepo.findByAuthUserId.mockResolvedValue(makeAppUser({ person: completePerson }));

      expect(await service.getEnrichmentStatus('user-1')).toEqual({ needsEnrichment: false });
      expect(mockRepo.hasActivity).not.toHaveBeenCalled();
    });

    it('is true when the profile is incomplete and the user has used the app', async () => {
      mockRepo.findByAuthUserId.mockResolvedValue(
        makeAppUser({ person: { ...completePerson, city: undefined } }),
      );
      mockRepo.hasActivity.mockResolvedValue(true);

      expect(await service.getEnrichmentStatus('user-1')).toEqual({ needsEnrichment: true });
      expect(mockRepo.hasActivity).toHaveBeenCalledWith('user-1');
    });

    it('is false when the user has not used the app yet', async () => {
      mockRepo.findByAuthUserId.mockResolvedValue(makeAppUser());
      mockRepo.hasActivity.mockResolvedValue(false);

      expect(await service.getEnrichmentStatus('user-1')).toEqual({ needsEnrichment: false });
    });
  });

  // ── deleteMe ────────────────────────────────────────────────────────────────

  describe('deleteMe', () => {
    it('throws NotFoundException when AppUser does not exist', async () => {
      mockRepo.findByAuthUserId.mockResolvedValue(null);

      await expect(service.deleteMe('unknown-user')).rejects.toThrow(NotFoundException);
    });

    it('refuses while the user owns a restaurant', async () => {
      mockRepo.findByAuthUserId.mockResolvedValue(makeAppUser({ isRestaurantOwner: true }));

      await expect(service.deleteMe('user-1')).rejects.toThrow(ConflictException);
      expect(mockRepo.anonymize).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('anonymizes the account and tells the other modules', async () => {
      mockRepo.findByAuthUserId.mockResolvedValue(makeAppUser());

      await service.deleteMe('user-1');

      expect(mockRepo.anonymize).toHaveBeenCalledWith('user-1');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        USER_DELETED_EVENT,
        new UserDeletedEvent('user-1'),
      );
    });
  });
});
