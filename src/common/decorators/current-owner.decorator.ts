import { ExecutionContext, createParamDecorator } from '@nestjs/common';

// L'utilisateur est attaché à la requête par le guard global de better-auth.
export const CurrentOwner = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user: { id: string } }>();
  return request.user.id;
});
