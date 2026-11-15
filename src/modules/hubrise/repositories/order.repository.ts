import {
  EntityManager,
  EntityRepository,
  LockMode,
  RequiredEntityData,
} from '@mikro-orm/postgresql';

import { Customer } from '../../customer/entities/customer.entity';
import { PointsTransaction } from '../../customer/entities/points-transaction.entity';
import { Outlet } from '../../restaurant/entities/outlet.entity';
import { AppUser } from '../../user/entities/app-user.entity';
import { Order } from '../entities/order.entity';
import { PendingPoints } from '../entities/pending-points.entity';

/** Ce qu'un événement HubRise met à jour sur la commande */
type OrderUpdate = Pick<Order, 'status' | 'ref' | 'total' | 'currency' | 'points'>;

const COMPLETED_STATUS = 'completed';

/** Statuts HubRise d'une commande qui n'a pas été payée */
const UNPAID_STATUSES = ['rejected', 'cancelled', 'delivery_failed'];

export class OrderRepository extends EntityRepository<Order> {
  /**
   * Crée la commande à son premier événement, puis la met à jour.
   * completed : la commande vient de passer à « completed » avec cet événement.
   */
  async saveFromHubrise({
    hubriseOrderId,
    outlet,
    orderedAt,
    ...update
  }: OrderUpdate & { hubriseOrderId: string; outlet: Outlet; orderedAt: Date }): Promise<{
    order: Order;
    completed: boolean;
  }> {
    const order =
      (await this.findOne({ hubriseOrderId })) ??
      this.create({
        hubriseOrderId,
        restaurant: outlet.restaurant,
        outlet,
        orderedAt,
      } as RequiredEntityData<Order>);
    const wasCompleted = order.status === COMPLETED_STATUS;
    this.assign(order, update);
    await this.em.flush();
    return { order, completed: !wasCompleted && order.status === COMPLETED_STATUS };
  }

  /** Crédite les points de la commande au client du restaurant. null si elle n'est pas récupérable. */
  async claimForUser(orderId: string, userId: string): Promise<PointsTransaction | null> {
    return this.em.transactional(async (em) => {
      const order = await this.findClaimable(em, orderId);
      if (!order) return null;

      const user = em.getReference(AppUser, userId);
      const customer = await em.getRepository(Customer).findOrCreateLocked(user, order.restaurant);

      em.assign(order, { user, claimedAt: new Date() });
      return customer.addPoints(order.points, `Commande ${order.ref ?? order.hubriseOrderId}`);
    });
  }

  /** Garde les points de la commande en attente du compte de cet email. null si elle n'est pas récupérable. */
  async claimForEmail(orderId: string, email: string): Promise<Order | null> {
    return this.em.transactional(async (em) => {
      const order = await this.findClaimable(em, orderId);
      if (!order) return null;

      order.claimedAt = new Date();
      em.getRepository(PendingPoints).add(order, email);
      return order;
    });
  }

  /** Verrouillée jusqu'à la fin de la transaction : deux récupérations en parallèle ne créditent qu'une fois */
  private findClaimable(em: EntityManager, orderId: string): Promise<Order | null> {
    return em.findOne(
      Order,
      { id: orderId, claimedAt: null, points: { $gt: 0 }, status: { $nin: UNPAID_STATUSES } },
      { lockMode: LockMode.PESSIMISTIC_WRITE },
    );
  }
}
