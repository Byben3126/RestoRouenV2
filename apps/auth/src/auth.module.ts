//auth.module.ts
import { Module } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { DatabaseModule } from '@app/database';

import { auth } from './auth';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Account, Session, User, Verification } from './entities';
import { MessagingModule } from './messaging.module';

@Module({
  imports: [
    MikroOrmModule.forFeature([User, Account, Session, Verification]),
    DatabaseModule,
    MessagingModule, // 👈 pour AuthService
    BetterAuthModule.forRootAsync({
      imports: [MessagingModule], // 👈 pour que le factory voie AUTH_SERVICE
      useFactory: (orm: MikroORM, client: ClientProxy) => ({
        auth: auth(orm, client),
      }),
      inject: [MikroORM, 'AUTH_SERVICE'],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
