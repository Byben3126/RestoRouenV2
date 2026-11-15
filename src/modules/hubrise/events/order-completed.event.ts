export const ORDER_COMPLETED_EVENT = 'order.completed';

/** Émis quand une commande passe à « completed » : le client peut récupérer ses points sur la tablette */
export class OrderCompletedEvent {
  constructor(
    public readonly outletId: string,
    /** Token signé de la commande, à afficher en QR code */
    public readonly token: string,
    public readonly expiresAt: Date,
    public readonly points: number,
    public readonly ref?: string,
  ) {}
}
