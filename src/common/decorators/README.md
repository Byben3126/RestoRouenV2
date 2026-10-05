Le dossier decorators/ contient des décorateurs personnalisés qui simplifient et rendent ton code plus lisible.

Un décorateur est un raccourci magique qui remplace du code répétitif.

----------- AVEC -----------
@Get('profile')
getProfile(@CurrentUser() user: User) { // ✅ Magique !
return user;
}

----------- SANS -----------

@Get('profile')
getProfile(@Request() req) {
// Tu dois extraire l'user du request à chaque fois 😱
const user = req.user;

if (!user) {
throw new UnauthorizedException();
}

return user;
}

//decorators/current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
(data: unknown, ctx: ExecutionContext) => {
const request = ctx.switchToHttp().getRequest();
return request.user; // Extrait l'user du request
},
);
