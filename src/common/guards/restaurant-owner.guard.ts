import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { EntityManager } from '@mikro-orm/core';

import { Restaurant } from '../../modules/restaurant/entities/restaurant.entity';

@Injectable()
export class RestaurantOwnerGuard implements CanActivate {
  constructor(private readonly em: EntityManager) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // user : posé par le guard global de nestjs-better-auth, qui passe avant celui-ci
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { id: string } | null; restaurantId: string }>();
    if (!request.user) throw new UnauthorizedException();

    const restaurant = await this.em.findOne(Restaurant, { user: { authUser: request.user.id } });
    if (!restaurant) throw new ForbiddenException('No restaurant found for this user');

    request.restaurantId = restaurant.id;
    return true;
  }
}
