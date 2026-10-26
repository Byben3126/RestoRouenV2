import type { EmailTemplate } from './email.service';

/** Jeton d'injection du client OneSignal */
export const ONESIGNAL_CLIENT = Symbol('ONESIGNAL_CLIENT');

/** Modèles d'email OneSignal repris tels quels de la V1 : ONESIGNAL_APP_ID doit être la même app */

/** Variable : {{code}} */
export const EMAIL_VERIFICATION_TEMPLATE: EmailTemplate = {
  id: '9cdc030e-f51c-4f98-89ec-d86a6f737913',
  subject: 'Vérification de votre Email',
};

/** Variables : {{host}} (URL de l'API) et {{token}} ; le lien mène à GET /resetpassword/:token */
export const RESET_PASSWORD_TEMPLATE: EmailTemplate = {
  id: '65a39453-dfa8-4562-855c-7b1d3a131ccf',
  subject: 'Demande de réinitialisation de votre mot de passe',
};
