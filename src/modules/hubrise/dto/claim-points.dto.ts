import { Transform } from 'class-transformer';
import { IsEmail, IsJWT } from 'class-validator';

export class ClaimPointsDto {
  /** Token signé de la commande, affiché par la tablette du restaurant */
  @IsJWT()
  token!: string;
}

export class ClaimPointsByEmailDto extends ClaimPointsDto {
  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}
