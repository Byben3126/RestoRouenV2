import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  ORDER_COMPLETED_EVENT,
  OrderCompletedEvent,
} from '../../hubrise/events/order-completed.event';
import { TabletGateway } from '../tablet.gateway';

/** Relaie les événements métier vers les tablettes du point de vente concerné */
@Injectable()
export class TabletListener {
  constructor(private readonly gateway: TabletGateway) {}

  @OnEvent(ORDER_COMPLETED_EVENT)
  handleOrderCompleted({ outletId, ...payload }: OrderCompletedEvent) {
    this.gateway.notifyOutlet(outletId, 'order.completed', payload);
  }
}
