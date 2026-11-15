import { HttpException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import axios, { AxiosError } from 'axios';

import { Outlet } from '../restaurant/entities/outlet.entity';
import { OutletRepository } from '../restaurant/repositories/outlet.repository';
import { HubriseEvent } from './dto/hubrise.dto';
import { Order } from './entities';
import { OrderService } from './order.service';
import { OrderRepository } from './repositories/order.repository';

const HUBRISE_TOKEN_URL = 'https://manager.hubrise.com/oauth2/v1/token';
const HUBRISE_API_URL = 'https://api.hubrise.com/v1';

interface HubriseToken {
  access_token: string;
  location_id: string;
}

@Injectable()
export class HubriseService {
  private readonly logger = new Logger(HubriseService.name);
  private readonly hubriseClient = axios.create({ timeout: 5_000 });

  constructor(
    @InjectRepository(Outlet)
    private readonly outletRepository: OutletRepository,
    private readonly em: EntityManager,
    @InjectRepository(Order)
    private readonly orderRepository: OrderRepository,
    private readonly orderService: OrderService,
  ) {
    this.hubriseClient.interceptors.response.use(undefined, (error: AxiosError) => {
      if (!error.response) throw error;
      throw new HttpException(error.response.data as object, error.response.status);
    });
  }

  /** Enregistre la commande à sa réception, puis la met à jour à chaque événement */
  async saveOrder(outletId: string, event: HubriseEvent): Promise<void> {
    const state = event.new_state;
    if (event.resource_type !== 'order' || !state) return;

    const outlet = await this.outletRepository.findOne({ id: outletId });
    if (!outlet || outlet.hubriseLocationId !== state.location_id) {
      // Par exemple une ancienne connexion HubRise qui envoie encore vers cette URL
      this.logger.warn(
        `Order ${state.id} of location ${state.location_id} ignored for outlet ${outletId}`,
      );
      return;
    }

    const [amount, currency] = state.total.split(' ');
    // HubRise donne toujours 2 décimales : « 50.60 » vaut 5060 centimes, sans passer par un flottant
    const total = Number(amount.replace('.', ''));

    const { order, completed } = await this.orderRepository.saveFromHubrise({
      hubriseOrderId: state.id,
      outlet,
      orderedAt: new Date(state.created_at),
      status: state.status,
      ref: state.ref ?? undefined,
      total,
      currency,
      // 1 point par euro entier
      points: Math.floor(total / 100),
    });
    if (completed) await this.orderService.sendClaimToken(order, outlet.id);
  }

  /** Échange le code OAuth contre le token de l'établissement HubRise, puis s'abonne à ses commandes */
  async connect(outletId: string, code: string): Promise<void> {
    const outlet = await this.outletRepository.findOne({ id: outletId });
    if (!outlet) throw new NotFoundException('Outlet not found');

    const { data: token } = await this.hubriseClient.post<HubriseToken>(
      HUBRISE_TOKEN_URL,
      new URLSearchParams({
        code,
        client_id: process.env.HUBRISE_CLIENT_ID!,
        client_secret: process.env.HUBRISE_CLIENT_SECRET!,
      }),
    );

    // HubRise doit joindre l'API depuis internet : en local, API_URL reste sur localhost pour Better Auth
    const publicApiUrl = process.env.PUBLIC_API_URL ?? process.env.API_URL;
    await this.hubriseClient.post(
      `${HUBRISE_API_URL}/callback`,
      {
        url: `${publicApiUrl}/hubrize/order/${outletId}`,
        events: { order: ['create', 'update'] },
      },
      { headers: { 'X-Access-Token': token.access_token } },
    );

    outlet.hubriseAccessToken = token.access_token;
    outlet.hubriseLocationId = token.location_id;
    await this.em.flush();
  }
}
