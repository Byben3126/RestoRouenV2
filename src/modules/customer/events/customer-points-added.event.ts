export const CUSTOMER_POINTS_ADDED_EVENT = 'customer.points.added';

/** Émis après l'enregistrement des points crédités à un client par un restaurant */
export class CustomerPointsAddedEvent {
  constructor(
    public readonly userId: string,
    public readonly restaurantId: string,
    public readonly amount: number,
    public readonly balance: number,
    public readonly reason?: string,
  ) {}
}
