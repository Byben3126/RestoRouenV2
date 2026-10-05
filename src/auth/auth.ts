import { EventEmitter2 } from '@nestjs/event-emitter';

import { MikroORM } from '@mikro-orm/core';
import { betterAuth } from 'better-auth';
import { mikroOrmAdapter } from 'better-auth-mikro-orm';
import { admin } from 'better-auth/plugins';

import { AUTH_USER_CREATED_EVENT, AuthUserCreatedEvent } from './events/auth-user-created.event';

export const auth = (orm: MikroORM, eventEmitter?: EventEmitter2) =>
  betterAuth({
    baseURL: process.env.API_URL,
    basePath: '/auth',
    database: mikroOrmAdapter(orm),

    trustedOrigins: [process.env.FRONTEND_URL || ''],
    account: {
      storeStateStrategy: 'database',
      skipStateCookieCheck: true,
    },
    advanced: {
      crossSubDomainCookies: {
        enabled: !!process.env.COOKIE_DOMAIN,
        domain: process.env.COOKIE_DOMAIN || 'localhost',
      },
    },
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectURI: `${process.env.API_URL}/auth/callback/google`,
      },
    },
    plugins: [admin()],

    ...(eventEmitter && {
      databaseHooks: {
        user: {
          create: {
            after: (user) => {
              eventEmitter.emit(
                AUTH_USER_CREATED_EVENT,
                new AuthUserCreatedEvent(user.id, user.email, user.name),
              );
              return Promise.resolve();
            },
          },
        },
      },
    }),
  });
