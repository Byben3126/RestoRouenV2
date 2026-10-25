import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MikroORM } from '@mikro-orm/core';
import { betterAuth } from 'better-auth';
import { mikroOrmAdapter } from 'better-auth-mikro-orm';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { admin, bearer } from 'better-auth/plugins';

import { User } from './entities/user.entity';
import { AUTH_USER_CREATED_EVENT, AuthUserCreatedEvent } from './events/auth-user-created.event';

const logger = new Logger('Auth');

/** L'app envoie le prénom et le nom séparément à l'inscription par email */
type SignUpBody = { firstName?: string; lastName?: string };

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
    // bearer : l'app React Native s'authentifie par token (header Authorization) plutôt que par cookie
    plugins: [admin(), bearer()],

    hooks: {
      // L'app envoie firstName et lastName ; Better Auth exige name : on le construit à partir d'eux.
      // async sans await : une erreur levée devient une promesse rejetée, comme Better Auth l'attend
      // eslint-disable-next-line @typescript-eslint/require-await
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/sign-up/email') {
          const body = (ctx.body ?? {}) as SignUpBody;

          if (!body.firstName || !body.lastName) {
            throw new APIError('BAD_REQUEST', { message: 'firstName and lastName are required' });
          }

          return { context: { body: { ...body, name: `${body.firstName} ${body.lastName}` } } };
        }
      }),
    },

    ...(eventEmitter && {
      databaseHooks: {
        user: {
          create: {
            after: async (user, ctx) => {
              const { firstName, lastName } = (ctx?.body ?? {}) as SignUpBody;
              try {
                // Attend l'AppUser et la Person : le compte est complet dès la réponse d'inscription
                await eventEmitter.emitAsync(
                  AUTH_USER_CREATED_EVENT,
                  new AuthUserCreatedEvent(user.id, user.email, user.name, firstName, lastName),
                );
              } catch (error) {
                logger.error(`Sign-up failed for ${user.email}, user deleted`, error);
                await orm.em.fork().nativeDelete(User, { id: user.id });
                throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Sign-up failed' });
              }
            },
          },
        },
      },
    }),
  });
