import type { EmailTemplate } from './email.service';

export const ONESIGNAL_CLIENT = Symbol('ONESIGNAL_CLIENT');

export const EMAIL_VERIFICATION_TEMPLATE: EmailTemplate = {
  id: '9cdc030e-f51c-4f98-89ec-d86a6f737913',
  subject: 'Vérification de votre Email',
};


export const RESET_PASSWORD_TEMPLATE: EmailTemplate = {
  id: 'ea387048-36ab-40e3-8d8e-0c650ed4a7e1',
  subject: 'Demande de réinitialisation de votre mot de passe',
};
