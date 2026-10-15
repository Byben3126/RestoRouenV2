import { Logger } from '@nestjs/common';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

import { MikroORM, RequestContext } from '@mikro-orm/core';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { Server, Socket } from 'socket.io';

/** Room de toutes les connexions d'un utilisateur (plusieurs appareils possibles) */
export const userRoom = (userId: string) => `user:${userId}`;

/**
 * Point d'entrée WebSocket (Socket.IO) de l'app.
 * Le client s'authentifie à la connexion, avec le token de session better-auth
 * (`auth: { token }`, app React Native) ou le cookie de session.
 * Le socket ne fait que prévenir le client : l'état fait foi via l'API REST,
 * à recharger à chaque (re)connexion.
 */
@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(
    private readonly orm: MikroORM,
    private readonly authService: AuthService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const userId = await this.authenticate(client);
    if (!userId) {
      client.disconnect(true);
      return;
    }
    await client.join(userRoom(userId));
  }

  notifyUser(userId: string, event: string, payload: unknown): void {
    this.server.to(userRoom(userId)).emit(event, payload);
  }

  private async authenticate(client: Socket): Promise<string | null> {
    const headers = fromNodeHeaders(client.handshake.headers);
    const token = (client.handshake.auth as { token?: unknown }).token;
    // Lu par le plugin bearer de better-auth
    if (typeof token === 'string') headers.set('authorization', `Bearer ${token}`);

    try {
      // Le handshake ne passe pas par le middleware HTTP qui crée le contexte MikroORM
      const session = await RequestContext.create(this.orm.em, () =>
        this.authService.api.getSession({ headers }),
      );
      return session?.user.id ?? null;
    } catch (error) {
      this.logger.warn(`Socket authentication failed: ${String(error)}`);
      return null;
    }
  }
}
