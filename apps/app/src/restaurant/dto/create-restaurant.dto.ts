import { IsNumber, IsString, MinLength } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;
}
