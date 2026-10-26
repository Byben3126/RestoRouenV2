import { Inject, Injectable, Logger } from '@nestjs/common';

import * as OneSignal from '@onesignal/node-onesignal';

import type { OneSignalClient } from '../onesignal/onesignal.client';
import { ONESIGNAL_CLIENT } from '../onesignal/onesignal.constants';

export interface PushMessage {
  headings: { en: string } & OneSignal.LanguageStringMap;
  contents: { en: string } & OneSignal.LanguageStringMap;
  data?: object;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);

  constructor(@Inject(ONESIGNAL_CLIENT) private readonly client: OneSignalClient) {}

  async sendToUsers(userIds: string[], message: PushMessage): Promise<void> {
    if (userIds.length === 0) return;

    if (!this.client) {
      this.logger.debug(`OneSignal not configured, push skipped: ${message.headings.en}`);
      return;
    }

    const notification = new OneSignal.Notification();
    notification.app_id = process.env.ONESIGNAL_APP_ID!;
    notification.target_channel = 'push';
    notification.include_aliases = { external_id: userIds };
    notification.headings = message.headings;
    notification.contents = message.contents;
    notification.data = message.data;

    // Réessaie les erreurs réseau et 429/5xx, avec une clé d'idempotence : pas de doublon
    const { response } = await this.client.createNotificationWithRetry(notification);

    if (!response.id) {
      this.logger.warn(`Push not sent: ${JSON.stringify(response.errors)}`);
    }
  }
}
