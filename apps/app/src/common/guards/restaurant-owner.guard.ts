import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/core';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';

@Injectable()
export class RestaurantOwnerGuard implements CanActivate {
  constructor(private readonly em: EntityManager) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ userId: string; restaurantId: string }>();

    const restaurant = await this.em.findOne(Restaurant, { user: { authUser: request.userId } });
    if (!restaurant) throw new ForbiddenException('No restaurant found for this user');

    request.restaurantId = restaurant.id;
    return true;
  }
}
