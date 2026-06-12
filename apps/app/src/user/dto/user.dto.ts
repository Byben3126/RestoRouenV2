import { Gender } from '../entities/person.entity';
import { Language } from '../entities/user-profile.entity';

export class UserDto {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string;
  firstName: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  city?: string;
  country?: string;
  language: Language;
  linkCode: string;
  isActive: boolean;
  isRestaurantOwner: boolean;
}
