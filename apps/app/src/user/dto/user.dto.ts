import { Exclude, Expose } from 'class-transformer';

import { Language } from '../entities/app-user.entity';
import { Gender } from '../entities/person.entity';

@Exclude()
export class UserDto {
  @Expose() id!: string;
  @Expose() email!: string;
  @Expose() name!: string;
  @Expose() emailVerified!: boolean;
  @Expose() image?: string;
  @Expose() firstName!: string;
  @Expose() lastName?: string;
  @Expose() dateOfBirth?: Date;
  @Expose() gender?: Gender;
  @Expose() city?: string;
  @Expose() country?: string;
  @Expose() language!: Language;
  @Expose() linkCode!: string;
  @Expose() isActive!: boolean;
  @Expose() isRestaurantOwner!: boolean;
  @Expose() stripeCustomerId?: string;
}
