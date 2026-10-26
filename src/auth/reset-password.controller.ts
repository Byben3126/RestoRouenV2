import { Controller, Get, Param, Res } from '@nestjs/common';

import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';

// Écran de l'app où l'utilisateur saisit son nouveau mot de passe (même lien qu'en V1)
const NEW_PASSWORD_DEEP_LINK = 'restoRouen://landing/NewPassword';

/**
 * Lien de l'email « mot de passe oublié » (modèle OneSignal de la V1 : {{host}}/resetpassword/{{token}}).
 * Ouvre l'app avec le jeton ; l'app envoie ensuite le nouveau mot de passe à POST /auth/reset-password.
 */
@AllowAnonymous()
@Controller('resetpassword')
export class ResetPasswordController {
  @Get(':token')
  openApp(@Param('token') token: string, @Res() res: Response) {
    // Redirection écrite à la main : l'intercepteur global envelopperait la réponse de @Redirect
    res.redirect(`${NEW_PASSWORD_DEEP_LINK}?token=${encodeURIComponent(token)}`);
  }
}
