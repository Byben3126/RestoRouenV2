import { EntityRepository } from '@mikro-orm/postgresql';

import { Outlet } from '../entities/outlet.entity';

export class OutletRepository extends EntityRepository<Outlet> {
  findByRestaurant(restaurantId: string): Promise<Outlet[]> {
    return this.find({ restaurant: restaurantId, isActive: true }, { orderBy: { createdAt: 'ASC' } });
  }
}
