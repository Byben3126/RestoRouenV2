import { Injectable } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/core';

import { User } from '@app/auth/entities/user.entity';

import { UserDto } from './dto/user.dto';
import { Person } from './entities/person.entity';
import { UserProfile } from './entities/user-profile.entity';
import { PersonNotFoundException } from './exceptions/person-not-found.exception';
import { UserProfileNotFoundException } from './exceptions/user-profile-not-found.exception';
import { UserMapper } from './mappers/user.mapper';

@Injectable()
export class UserService {
  constructor(private readonly em: EntityManager) {}

  async getMe(userId: string): Promise<UserDto> {
    const user = await this.em.findOneOrFail(User, { id: userId });

    const person = await this.em.findOne(Person, { user: userId });
    if (!person) throw new PersonNotFoundException(userId);

    const profile = await this.em.findOne(UserProfile, { user: userId });
    if (!profile) throw new UserProfileNotFoundException(userId);

    return UserMapper.toDto(user, person, profile);
  }
}
