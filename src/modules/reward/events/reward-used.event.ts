export const REWARD_USED_EVENT = 'reward.used';

/** Émis après qu'un restaurant a scanné le token d'une récompense et débité les points du client */
export class RewardUsedEvent {
  constructor(
    public readonly userId: string,
    public readonly restaurantId: string,
    public readonly rewardId: string,
    public readonly pointsSpent: number,
  ) {}
}
