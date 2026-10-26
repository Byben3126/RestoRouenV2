import { Logger } from '@nestjs/common';

import { MikroORM, RequestContext } from '@mikro-orm/core';
import { betterAuth } from 'better-auth';
import { mikroOrmAdapter } from 'better-auth-mikro-orm';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { admin, bearer, emailOTP } from 'better-auth/plugins';

import type { EmailService } from '../onesignal/email.service';
import { EMAIL_VERIFICATION_TEMPLATE } from '../onesignal/onesignal.constants';
import type { UserService } from '../user/user.service';
import { User } from './entities/user.entity';

const logger = new Logger('Auth');

/** L'app envoie le prénom et le nom séparément à l'inscription par email */
type SignUpBody = { email?: string; firstName?: string; lastName?: string };

/** Services Nest appelés par les hooks ; absents pour l'instance de l'AuthGuard, qui ne lit que les sessions */
export interface AuthServices {
  userService: UserService;
  emailService: EmailService;
}

export const auth = (orm: MikroORM, services?: AuthServices) =>
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
      requireEmailVerification: true,
    },
    emailVerification: {
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectURI: `${process.env.API_URL}/auth/callback/google`,
      },
    },
    // bearer : l'app React Native s'authentifie par token (header Authorization) plutôt que par cookie
    plugins: [
      admin(),
      bearer(),
      // Vérification de l'email par un code à saisir dans l'app, comme en V1
      emailOTP({
        otpLength: 5,
        expiresIn: 10 * 60,
        overrideDefaultEmailVerification: true,
        sendVerificationOTP: ({ email, otp, type }) => {
          if (type === 'email-verification') {
            void services?.emailService.sendTemplate(email, EMAIL_VERIFICATION_TEMPLATE, {
              code: otp,
            });
          }
          return Promise.resolve();
        },
      }),
    ],

    hooks: {
      // L'app envoie firstName et lastName ; Better Auth exige name : on le construit à partir d'eux
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === '/sign-up/email') {
          const body = (ctx.body ?? {}) as SignUpBody;

          if (!body.firstName || !body.lastName) {
            throw new APIError('BAD_REQUEST', { message: 'firstName and lastName are required' });
          }

          // Un compte jamais vérifié n'appartient encore à personne : la nouvelle inscription le remplace
          const { email } = body;
          if (email && services) {
            await RequestContext.create(orm.em, () =>
              services.userService.deleteUnverifiedAccount(email),
            );
          }

          return { context: { body: { ...body, name: `${body.firstName} ${body.lastName}` } } };
        }
      }),

      // Toute réponse de Better Auth qui contient un user renvoie le même que GET /users/me
      after: createAuthMiddleware(async (ctx) => {
        const returned = ctx.context.returned as { user?: { id?: string } } | undefined;
        // Sans requête : appel interne (getSession des guards), rien n'est renvoyé à l'app
        if (!services || !ctx.request || returned instanceof APIError) return;

        const userId = returned?.user?.id;
        if (!userId) return;

        try {
          const user = await RequestContext.create(orm.em, () =>
            services.userService.getMe(userId),
          );
          return ctx.json({ ...returned, user });
        } catch (error) {
          // Le user de Better Auth reste dans la réponse plutôt que de la faire échouer
          logger.warn(`User ${userId} not mapped in the auth response: ${String(error)}`);
        }
      }),
    },

    ...(services && {
      databaseHooks: {
        user: {
          create: {
            after: async (user, ctx) => {
              const { firstName, lastName } = (ctx?.body ?? {}) as SignUpBody;
              try {
                // Attend l'AppUser et la Person : le compte est complet dès la réponse d'inscription.
                // Inscription Google : seul le nom complet est connu, il devient le prénom
                await RequestContext.create(orm.em, () =>
                  services.userService.createFromAuthUser({
                    userId: user.id,
                    email: user.email,
                    firstName: firstName ?? user.name,
                    lastName,
                  }),
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
