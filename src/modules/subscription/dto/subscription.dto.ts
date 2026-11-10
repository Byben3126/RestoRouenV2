import { Exclude, Expose } from 'class-transformer';

import { SubscriptionPlan, SubscriptionStatus } from '../entities/subscription_restaurant.entity';

@Exclude()
export class SubscriptionDto {
  @Expose() id!: string;
  @Expose() stripeSubscriptionId?: string;
  @Expose() plan!: SubscriptionPlan;
  @Expose() status!: SubscriptionStatus;
  @Expose() cancelAtPeriodEnd!: boolean;
  @Expose() currentPeriodEnd?: Date;
  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
}
