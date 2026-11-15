import { EntityRepository } from '@mikro-orm/postgresql';

import { Outlet } from '../entities/outlet.entity';

export class OutletRepository extends EntityRepository<Outlet> {
  findByRestaurant(restaurantId: string): Promise<Outlet[]> {
    return this.find(
      { restaurant: restaurantId, isActive: true },
      { orderBy: { createdAt: 'ASC' } },
    );
  }

  /** Point de vente actif de la tablette qui présente ce token */
  findByTabletToken(token: string): Promise<Outlet | null> {
    return this.findOne({ tabletTokenHash: Outlet.hashTabletToken(token), isActive: true });
  }
}
