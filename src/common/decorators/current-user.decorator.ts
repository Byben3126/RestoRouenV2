import { ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common';

/** Id de l'utilisateur connecté, dont la session est posée sur la requête par le guard global de nestjs-better-auth */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const { user } = ctx.switchToHttp().getRequest<{ user?: { id: string } | null }>();
  if (!user) throw new UnauthorizedException();
  return user.id;
});
