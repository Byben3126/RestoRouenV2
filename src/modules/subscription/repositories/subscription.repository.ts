import { EntityRepository } from '@mikro-orm/postgresql';

import { Subscription } from '../entities/subscription_restaurant.entity';

export class SubscriptionRepository extends EntityRepository<Subscription> {
  async findByRestaurantId(restaurantId: string): Promise<Subscription | null> {
    return this.findOne({ restaurant: restaurantId });
  }
}
