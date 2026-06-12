import { User } from '@app/auth/entities/user.entity';

import { UserDto } from '../dto/user.dto';
import { Person } from '../entities/person.entity';
import { UserProfile } from '../entities/user-profile.entity';

export class UserMapper {
  static toDto(user: User, person: Person, profile: UserProfile): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      image: user.image,
      firstName: person.firstName,
      lastName: person.lastName,
      dateOfBirth: person.dateOfBirth,
      gender: person.gender,
      city: person.city,
      country: person.country,
      language: profile.language,
      linkCode: profile.linkCode,
      isActive: profile.isActive,
      isRestaurantOwner: profile.isRestaurantOwner,
    };
  }
}
