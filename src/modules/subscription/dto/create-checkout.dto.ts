import { IsEnum } from 'class-validator';

import { SubscriptionPlan } from '../entities/subscription_restaurant.entity';

export class CreateCheckoutDto {
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;
}
