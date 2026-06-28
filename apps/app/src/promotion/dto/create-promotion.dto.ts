import { Transform } from 'class-transformer';
import { IsArray, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

import { PromotionAudience, PromotionInternalStatus } from '../entities/promotion.entity';

export class CreatePromotionDto {
  @IsString()
  name!: string;

  @IsEnum(PromotionAudience)
  audience!: PromotionAudience;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  scheduledAt?: string;

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  expiresAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerIds?: string[];

  @IsEnum([PromotionInternalStatus.ACTIVE, PromotionInternalStatus.DRAFT])
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @Transform(({ value }) => value ?? PromotionInternalStatus.ACTIVE)
  status: PromotionInternalStatus = PromotionInternalStatus.ACTIVE;
}
