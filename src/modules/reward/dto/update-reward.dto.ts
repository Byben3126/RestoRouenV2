import { IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateRewardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  pointRequired?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaIds?: string[];
}
