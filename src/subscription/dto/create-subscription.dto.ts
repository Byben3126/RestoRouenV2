import { IsEnum, IsOptional, IsString } from 'class-validator';

import { SubscriptionPlan } from '../entities/subscription_restaurant.entity';

export class CreateSubscriptionDto {
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;

  @IsOptional()
  @IsString()
  stripeCustomerId?: string;
}
