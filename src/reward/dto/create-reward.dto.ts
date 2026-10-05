import { ApiProperty } from '@nestjs/swagger';

import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

import { RewardStatus } from '../entities/reward.entity';

export class CreateRewardDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  description?: string;

  @IsInt()
  @Min(1)
  pointRequired!: number;

  @IsOptional()
  @IsEnum([RewardStatus.ACTIVE, RewardStatus.DRAFT])
  @ApiProperty({ enum: [RewardStatus.ACTIVE, RewardStatus.DRAFT], required: false })
  status?: RewardStatus.ACTIVE | RewardStatus.DRAFT;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mediaIds?: string[];
}
