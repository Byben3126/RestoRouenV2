import { Transform } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

import { PromotionAudience } from '../entities/promotion.entity';

export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(PromotionAudience)
  audience?: PromotionAudience;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  scheduledAt?: Date;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  expiresAt?: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerIds?: string[];
}
