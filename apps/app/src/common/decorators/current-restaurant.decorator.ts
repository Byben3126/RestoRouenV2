import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const CurrentRestaurant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ restaurantId: string }>();
    return request.restaurantId;
  },
);
