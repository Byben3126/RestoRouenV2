import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { InjectRepository } from '@mikro-orm/nestjs';

import { UpdateUserDto } from './dto/update-user.dto';
import { UserDto } from './dto/user.dto';
import { AppUser } from './entities/app-user.entity';
import { USER_DELETED_EVENT, UserDeletedEvent } from './events/user-deleted.event';
import { PersonNotFoundException } from './exceptions/person-not-found.exception';
import { UserMapper } from './mappers/user.mapper';
import { AppUserRepository } from './repositories/app-user.repository';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(AppUser) private readonly appUserRepo: AppUserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getMe(userId: string): Promise<UserDto> {
    const appUser = await this.appUserRepo.findByAuthUserId(userId);
    if (!appUser) throw new NotFoundException(`AppUser not found for auth user ${userId}`);
    return UserMapper.toDto(appUser);
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<UserDto> {
    const appUser = await this.appUserRepo.findByAuthUserId(userId);
    if (!appUser) throw new NotFoundException(`AppUser not found for auth user ${userId}`);
    // Toujours créée avec l'AppUser : son absence est une incohérence, on ne la recrée pas ici
    if (!appUser.person) throw new PersonNotFoundException(userId);

    const updated = await this.appUserRepo.updateProfile(
      appUser,
      appUser.person,
      UserMapper.toAppUserData(dto),
      UserMapper.toPersonData(dto),
    );
    return UserMapper.toDto(updated);
  }

  /** Impossible tant que l'utilisateur a un restaurant : il doit d'abord le supprimer */
  async deleteMe(userId: string): Promise<void> {
    const appUser = await this.appUserRepo.findByAuthUserId(userId);
    if (!appUser) throw new NotFoundException(`AppUser not found for auth user ${userId}`);
    if (appUser.isRestaurantOwner) {
      throw new ConflictException('Delete your restaurant before deleting your account');
    }

    await this.appUserRepo.anonymize(userId);
    this.eventEmitter.emit(USER_DELETED_EVENT, new UserDeletedEvent(userId));
  }

  async createFromAuthUser(payload: {
    userId: string;
    name: string;
    email: string;
  }): Promise<void> {
    await this.appUserRepo.createFromAuthUser(payload);
  }
}
