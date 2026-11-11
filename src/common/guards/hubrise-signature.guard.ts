import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';

import { createHmac, timingSafeEqual } from 'crypto';
import type { Request } from 'express';

/** Ne laisse passer que les callbacks de HubRise : HMAC SHA-256 du body brut, signé avec le client secret */
@Injectable()
export class HubriseSignatureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Clé vide (variable de compose sans valeur) : n'importe qui calculerait la signature.
    // 500 plutôt que 401, pour que HubRise renvoie l'événement une fois le secret configuré.
    const secret = process.env.HUBRISE_CLIENT_SECRET;
    if (!secret) throw new InternalServerErrorException('HUBRISE_CLIENT_SECRET not configured');

    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();

    const expected = createHmac('sha256', secret)
      .update(request.rawBody ?? '')
      .digest();
    const received = Buffer.from(request.header('x-hubrise-hmac-sha256') ?? '', 'hex');

    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      throw new UnauthorizedException('Invalid HubRise signature');
    }
    return true;
  }
}
