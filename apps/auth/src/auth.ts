import { ClientProxy } from '@nestjs/microservices';

import { MikroORM } from '@mikro-orm/core';
import { betterAuth } from 'better-auth';
import { mikroOrmAdapter } from 'better-auth-mikro-orm';
import { admin } from 'better-auth/plugins';

export const auth = (orm: MikroORM, client?: ClientProxy) =>
  betterAuth({
    baseURL: process.env.API_URL,
    basePath: '/',
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

    ...(client && {
      databaseHooks: {
        user: {
          create: {
            after: async (user) => {
              client.emit('user.created', {
                id: user.id,
                email: user.email,
                name: user.name,
              });
            },
          },
        },
      },
    }),
  });
