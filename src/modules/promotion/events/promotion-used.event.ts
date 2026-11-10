export const PROMOTION_USED_EVENT = 'promotion.used';

/** Émis après qu'un restaurant a scanné le token d'une promotion */
export class PromotionUsedEvent {
  constructor(
    public readonly userId: string,
    public readonly restaurantId: string,
    public readonly promotionId: string,
  ) {}
}
