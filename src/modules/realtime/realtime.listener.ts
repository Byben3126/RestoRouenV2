import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import {
  CUSTOMER_POINTS_ADDED_EVENT,
  CustomerPointsAddedEvent,
} from '../customer/events/customer-points-added.event';
import { PROMOTION_USED_EVENT, PromotionUsedEvent } from '../promotion/events/promotion-used.event';
import { REWARD_USED_EVENT, RewardUsedEvent } from '../reward/events/reward-used.event';
import { RealtimeGateway } from './realtime.gateway';

/** Relaie les événements métier vers les appareils connectés de l'utilisateur concerné */
@Injectable()
export class RealtimeListener {
  constructor(private readonly gateway: RealtimeGateway) {}

  @OnEvent(CUSTOMER_POINTS_ADDED_EVENT)
  handlePointsAdded({ userId, ...payload }: CustomerPointsAddedEvent) {
    this.gateway.notifyUser(userId, 'points.added', payload);
  }

  @OnEvent(REWARD_USED_EVENT)
  handleRewardUsed({ userId, ...payload }: RewardUsedEvent) {
    this.gateway.notifyUser(userId, 'reward.used', payload);
  }

  @OnEvent(PROMOTION_USED_EVENT)
  handlePromotionUsed({ userId, ...payload }: PromotionUsedEvent) {
    this.gateway.notifyUser(userId, 'promotion.used', payload);
  }
}
