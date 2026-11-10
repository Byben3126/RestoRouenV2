import { Inject, Injectable, Logger } from '@nestjs/common';

import * as OneSignal from '@onesignal/node-onesignal';

import type { OneSignalClient } from './onesignal.client';
import { ONESIGNAL_CLIENT } from './onesignal.constants';

/** Modèle d'email créé dans OneSignal, avec le sujet de l'email */
export interface EmailTemplate {
  id: string;
  subject: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(@Inject(ONESIGNAL_CLIENT) private readonly client: OneSignalClient) {}

  /**
   * Email à partir d'un modèle OneSignal ; customData remplit ses variables (ex. {{code}}).
   * Ne lève jamais d'erreur : un échec est journalisé, l'appelant peut ne pas attendre l'envoi.
   */
  async sendTemplate(email: string, template: EmailTemplate, customData: object): Promise<void> {
    if (!this.client) {
      // En local, permet de récupérer le contenu (ex. le code de vérification) dans les logs
      this.logger.debug(
        `OneSignal not configured, email "${template.subject}" to ${email} skipped: ${JSON.stringify(customData)}`,
      );
      return;
    }

    const notification = new OneSignal.Notification();
    notification.app_id = process.env.ONESIGNAL_APP_ID!;
    notification.include_email_tokens = [email];
    notification.template_id = template.id;
    notification.email_subject = template.subject;
    notification.email_from_name = 'Resto Rouen';
    notification.custom_data = customData;

    try {
      const { response } = await this.client.createNotificationWithRetry(notification);
      if (!response.id) {
        this.logger.warn(`Email not sent: ${JSON.stringify(response.errors)}`);
      }
    } catch (error) {
      this.logger.error(`Email "${template.subject}" to ${email} failed`, error);
    }
  }
}
