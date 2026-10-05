import { IsInt, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class AddCustomerPointsDto {
  @IsInt()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
