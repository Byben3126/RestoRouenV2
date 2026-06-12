import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { MikroORM } from '@mikro-orm/core';
import { fromNodeHeaders } from 'better-auth/node';
import { IncomingMessage } from 'http';

import { auth } from '@app/auth/auth';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly betterAuth;

  constructor(private readonly orm: MikroORM) {
    this.betterAuth = auth(this.orm);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<IncomingMessage & { userId: string }>();

    const session = await this.betterAuth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) throw new UnauthorizedException();

    request.userId = session.user.id;
    return true;
  }
}
