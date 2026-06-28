import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { EntityManager, MikroORM } from '@mikro-orm/core';
import { betterAuth } from 'better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import { IncomingMessage } from 'http';

import { auth } from '@app/auth/auth';
import { User } from '@app/auth/entities/user.entity';

import { AppUser } from '../../user/entities/app-user.entity';

type BetterAuthInstance = ReturnType<typeof betterAuth>;
type SessionResult = Awaited<ReturnType<BetterAuthInstance['api']['getSession']>>;

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly betterAuth: BetterAuthInstance;

  constructor(
    private readonly orm: MikroORM,
    private readonly em: EntityManager,
  ) {
    this.betterAuth = auth(this.orm);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<IncomingMessage & { userId: string }>();

    const session = (await this.betterAuth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    })) as SessionResult;

    if (!session) throw new UnauthorizedException();

    request.userId = session.user.id;

    await this.ensureAppUser(session.user.id);

    return true;
  }

  private async ensureAppUser(userId: string): Promise<void> {
    const existing = await this.em.findOne(AppUser, { authUser: userId });
    if (existing) return;

    const authUser = this.em.getReference(User, userId);
    this.em.create(AppUser, { authUser } as any);
    await this.em.flush();
  }
}
