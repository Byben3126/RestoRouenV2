import { EntityRepository, RequiredEntityData } from '@mikro-orm/postgresql';

import { Order } from '../entities/order.entity';
import { PendingPoints } from '../entities/pending-points.entity';

export class PendingPointsRepository extends EntityRepository<PendingPoints> {
  /** Garde les points de la commande pour le compte de cet email, enregistrés au prochain flush */
  add(order: Order, email: string): PendingPoints {
    return this.create({ email, order } as RequiredEntityData<PendingPoints>);
  }
}
