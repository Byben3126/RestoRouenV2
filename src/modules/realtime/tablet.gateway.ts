import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

import { MikroORM } from '@mikro-orm/core';
import { Namespace, Socket } from 'socket.io';

import { Outlet } from '../restaurant/entities/outlet.entity';

/** Room des tablettes d'un point de vente */
export const outletRoom = (outletId: string) => `outlet:${outletId}`;

/**
 * WebSocket des tablettes face au client, à côté de la caisse (namespace /tablet).
 * La tablette s'authentifie avec le token de son point de vente (`auth: { token }`).
 */
@WebSocketGateway({
  namespace: 'tablet',
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class TabletGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Namespace;

  constructor(private readonly orm: MikroORM) {}

  async handleConnection(client: Socket): Promise<void> {
    const { token } = client.handshake.auth as { token?: unknown };
    const outlet =
      typeof token === 'string'
        ? await this.orm.em.fork().getRepository(Outlet).findByTabletToken(token)
        : null;
    if (!outlet) {
      client.disconnect(true);
      return;
    }
    await client.join(outletRoom(outlet.id));
  }

  notifyOutlet(outletId: string, event: string, payload: unknown): void {
    this.server.to(outletRoom(outletId)).emit(event, payload);
  }
}
