import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class OutletDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() latitude?: number;
  @Expose() longitude?: number;
  @Expose() formattedAddress?: string;
  @Expose() placeId?: string;
  @Expose() googleMyBusinessLink?: string;
  @Expose() isActive!: boolean;
  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}

@Exclude()
export class NearbyOutletDto extends OutletDto {
  /** Distance en mètres depuis le point de recherche */
  @Expose() distance!: number;
}

export class CreateOutletDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  formattedAddress?: string;

  @IsOptional()
  @IsString()
  placeId?: string;

  @IsOptional()
  @IsString()
  googleMyBusinessLink?: string;
}

export class UpdateOutletDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  formattedAddress?: string;

  @IsOptional()
  @IsString()
  placeId?: string;

  @IsOptional()
  @IsString()
  googleMyBusinessLink?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
