import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

import { Language } from '../entities/app-user.entity';
import { Gender } from '../entities/person.entity';

/**
 * Seuls les champs envoyés sont modifiés ; null efface un champ facultatif.
 * L'email et le mot de passe se changent via Better Auth (/auth/change-email, /auth/change-password).
 */
export class UpdateUserDto {
  // Obligatoire : on peut le changer, pas l'effacer
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string | null;

  @IsOptional()
  @IsDate()
  @Transform(({ value }: { value: unknown }) => (value ? new Date(value as string) : value))
  dateOfBirth?: Date | null;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender | null;

  @IsOptional()
  @IsString()
  city?: string | null;

  @IsOptional()
  @IsString()
  country?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(Language)
  language?: Language;
}
