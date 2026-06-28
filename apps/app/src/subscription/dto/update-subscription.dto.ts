import { IsBoolean, IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

import { SubscriptionStatus } from '../entities/subscription_restaurant.entity';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @IsOptional()
  @IsString()
  stripeSubscriptionId?: string;

  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @IsOptional()
  @IsDate()
  currentPeriodEnd?: Date;
}
