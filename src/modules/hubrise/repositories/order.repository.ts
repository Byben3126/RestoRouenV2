import { EntityRepository, RequiredEntityData } from '@mikro-orm/postgresql';

import { Outlet } from '../../restaurant/entities/outlet.entity';
import { Order } from '../entities/order.entity';

/** Ce qu'un événement HubRise met à jour sur la commande */
type OrderUpdate = Pick<Order, 'status' | 'ref' | 'total' | 'currency' | 'points'>;

export class OrderRepository extends EntityRepository<Order> {
  /** Crée la commande à son premier événement, puis la met à jour */
  async saveFromHubrise({
    hubriseOrderId,
    outlet,
    orderedAt,
    ...update
  }: OrderUpdate & { hubriseOrderId: string; outlet: Outlet; orderedAt: Date }): Promise<Order> {
    const order =
      (await this.findOne({ hubriseOrderId })) ??
      this.create({
        hubriseOrderId,
        restaurant: outlet.restaurant,
        outlet,
        orderedAt,
      } as RequiredEntityData<Order>);
    this.assign(order, update);
    await this.em.flush();
    return order;
  }
}
