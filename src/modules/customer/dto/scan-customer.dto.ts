import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ScanCustomerDto {
  /** Code de la carte client (QR code ou saisie manuelle), insensible à la casse */
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  linkCode!: string;
}
