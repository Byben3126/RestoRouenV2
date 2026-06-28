import { MikroORM } from '@mikro-orm/core';
import { betterAuth } from 'better-auth';
import { mikroOrmAdapter } from 'better-auth-mikro-orm';

export const auth = (orm: MikroORM) =>
  betterAuth({
    baseURL: process.env.API_URL,
    basePath: '/',
    database: mikroOrmAdapter(orm),

    trustedOrigins: [
      process.env.FRONTEND_URL || '', // frontend Next.js
    ],
    // Ajoute ici tes stratégies (email, google, etc.)
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
  });
