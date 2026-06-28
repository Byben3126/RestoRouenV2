import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { IncomingMessage } from 'http';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<IncomingMessage & { ownerId: string }>();

    const secret = request.headers['x-media-secret'];
    const ownerId = request.headers['x-media-owner'] as string | undefined;

    if (secret !== process.env.MEDIA_SECRET || !ownerId) throw new UnauthorizedException();

    request.ownerId = ownerId;
    return true;
  }
}
