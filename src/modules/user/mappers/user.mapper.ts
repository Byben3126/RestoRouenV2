import { EntityData } from '@mikro-orm/core';

import { UpdateUserDto } from '../dto/update-user.dto';
import { UserDto } from '../dto/user.dto';
import { AppUser } from '../entities/app-user.entity';
import { Person } from '../entities/person.entity';

export class UserMapper {
  static toDto(appUser: AppUser): UserDto {
    return {
      id: appUser.authUser.id,
      email: appUser.authUser.email,
      name: appUser.authUser.name,
      emailVerified: appUser.authUser.emailVerified,
      image: appUser.authUser.image,
      firstName: appUser.person?.firstName ?? appUser.authUser.name,
      lastName: appUser.person?.lastName,
      dateOfBirth: appUser.person?.dateOfBirth,
      gender: appUser.person?.gender,
      city: appUser.person?.city,
      country: appUser.person?.country,
      language: appUser.language,
      linkCode: appUser.linkCode,
      isActive: appUser.isActive,
      isRestaurantOwner: appUser.isRestaurantOwner,
      role: appUser.authUser.role,
    };
  }

  /** Les champs du profil modifiables qui vont sur AppUser */
  static toAppUserData({ language }: UpdateUserDto): EntityData<AppUser> {
    return { language };
  }

  /** Les champs du profil modifiables qui vont sur Person */
  static toPersonData({
    firstName,
    lastName,
    dateOfBirth,
    gender,
    city,
    country,
  }: UpdateUserDto): EntityData<Person> {
    return { firstName, lastName, dateOfBirth, gender, city, country };
  }
}
