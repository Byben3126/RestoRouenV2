import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const CurrentOwner = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ ownerId: string }>();
  return request.ownerId;
});
