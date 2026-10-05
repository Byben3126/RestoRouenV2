import { Module } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { auth } from './auth';
import { Account, Session, User, Verification } from './entities';

@Module({
  imports: [
    MikroOrmModule.forFeature([User, Account, Session, Verification]),
    BetterAuthModule.forRootAsync({
      useFactory: (orm: MikroORM, eventEmitter: EventEmitter2) => ({
        auth: auth(orm, eventEmitter),
        // Le body brut est conservé pour la vérification de signature du webhook Stripe
        enableRawBodyParser: true,
        // Le CORS est configuré une seule fois dans main.ts
        disableTrustedOriginsCors: true,
      }),
      inject: [MikroORM, EventEmitter2],
    }),
  ],
})
export class AuthModule {}
