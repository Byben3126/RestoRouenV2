import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';

import { InjectRepository } from '@mikro-orm/nestjs';

import {
  CUSTOMER_POINTS_ADDED_EVENT,
  CustomerPointsAddedEvent,
} from '../customer/events/customer-points-added.event';
import { AppUser } from '../user/entities/app-user.entity';
import { AppUserRepository } from '../user/repositories/app-user.repository';
import { Order } from './entities';
import { ORDER_COMPLETED_EVENT, OrderCompletedEvent } from './events/order-completed.event';
import { OrderRepository } from './repositories/order.repository';

/** Contenu du token de récupération des points d'une commande */
interface OrderTokenPayload {
  orderId: string;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: OrderRepository,
    @InjectRepository(AppUser)
    private readonly appUserRepository: AppUserRepository,
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Envoie aux tablettes du point de vente le token qui permet au client de récupérer ses points */
  async sendClaimToken(order: Order, outletId: string): Promise<void> {
    if (!order.points || order.claimedAt) return;

    const payload: OrderTokenPayload = { orderId: order.id };
    const token = await this.jwtService.signAsync(payload);
    const { exp } = this.jwtService.decode<{ exp: number }>(token);
    this.eventEmitter.emit(
      ORDER_COMPLETED_EVENT,
      new OrderCompletedEvent(outletId, token, new Date(exp * 1000), order.points, order.ref),
    );
  }

  /** Crédite les points de la commande à l'utilisateur connecté */
  async claimPoints(token: string, userId: string): Promise<{ points: number }> {
    return this.credit(await this.verifyToken(token), userId);
  }

  /**
   * Sans session : crédite le compte vérifié de cet email, sinon garde les points en attente de ce compte.
   * La réponse est la même dans les deux cas, pour ne pas révéler qui a un compte.
   */
  async claimPointsByEmail(token: string, email: string): Promise<{ points: number }> {
    const orderId = await this.verifyToken(token);
    const user = await this.appUserRepository.findOne({ authUser: { email, emailVerified: true } });
    if (user) return this.credit(orderId, user.id);

    const order = await this.orderRepository.claimForEmail(orderId, email);
    if (!order) throw new ConflictException('Points not available');
    return { points: order.points };
  }

  private async credit(orderId: string, userId: string): Promise<{ points: number }> {
    const transaction = await this.orderRepository.claimForUser(orderId, userId);
    if (!transaction) throw new ConflictException('Points not available');

    const { customer, amount, reason } = transaction;
    this.eventEmitter.emit(
      CUSTOMER_POINTS_ADDED_EVENT,
      new CustomerPointsAddedEvent(userId, customer.restaurant.id, amount, customer.points, reason),
    );
    return { points: amount };
  }

  private async verifyToken(token: string): Promise<string> {
    try {
      const { orderId } = await this.jwtService.verifyAsync<OrderTokenPayload>(token);
      return orderId;
    } catch {
      throw new BadRequestException('Invalid or expired token');
    }
  }
}
