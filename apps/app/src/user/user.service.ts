import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@mikro-orm/nestjs';

import { AppUser } from './entities/app-user.entity';
import { UserDto } from './dto/user.dto';
import { AppUserRepository } from './repositories/app-user.repository';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(AppUser) private readonly appUserRepo: AppUserRepository,
  ) {}

  async getMe(userId: string): Promise<UserDto> {
    const appUser = await this.appUserRepo.findByAuthUserId(userId);
    if (!appUser) throw new NotFoundException(`AppUser not found for auth user ${userId}`);
    return UserMapper.toDto(appUser);
  }
}
