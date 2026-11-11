import { HttpException, Injectable, NotFoundException } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import axios, { AxiosError } from 'axios';

import { Outlet } from '../restaurant/entities/outlet.entity';
import { OutletRepository } from '../restaurant/repositories/outlet.repository';

const HUBRISE_TOKEN_URL = 'https://manager.hubrise.com/oauth2/v1/token';
const HUBRISE_API_URL = 'https://api.hubrise.com/v1';

interface HubriseToken {
  access_token: string;
  location_id: string;
}

@Injectable()
export class HubriseService {
  private readonly hubriseClient = axios.create({ timeout: 5_000 });

  constructor(
    @InjectRepository(Outlet)
    private readonly outletRepository: OutletRepository,
    private readonly em: EntityManager,
  ) {
    this.hubriseClient.interceptors.response.use(undefined, (error: AxiosError) => {
      if (!error.response) throw error;
      throw new HttpException(error.response.data as object, error.response.status);
    });
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
