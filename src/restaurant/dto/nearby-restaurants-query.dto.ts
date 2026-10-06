import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive, Max, Min } from 'class-validator';

export class NearbyRestaurantsQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  /** Rayon de recherche en kilomètres */
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(50)
  radius: number = 10;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
