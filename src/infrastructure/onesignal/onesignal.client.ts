import * as OneSignal from '@onesignal/node-onesignal';

import { ONESIGNAL_CLIENT } from './onesignal.constants';

/** null quand OneSignal n'est pas configuré (local, tests) : rien n'est envoyé */
export type OneSignalClient = OneSignal.DefaultApi | null;

export const oneSignalClientProvider = {
  provide: ONESIGNAL_CLIENT,
  useFactory: (): OneSignalClient =>
    process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY
      ? new OneSignal.DefaultApi(
          OneSignal.createConfiguration({ restApiKey: process.env.ONESIGNAL_REST_API_KEY }),
        )
      : null,
};
