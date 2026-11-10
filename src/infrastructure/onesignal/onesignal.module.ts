import { Module } from '@nestjs/common';

import { EmailService } from './email.service';
import { oneSignalClientProvider } from './onesignal.client';
import { ONESIGNAL_CLIENT } from './onesignal.constants';

/** Client OneSignal (push et email) et envoi d'emails par modèle */
@Module({
  providers: [oneSignalClientProvider, EmailService],
  exports: [ONESIGNAL_CLIENT, EmailService],
})
export class OneSignalModule {}
