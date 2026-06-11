import { Module } from '@nestjs/common';

import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { DatabaseModule } from '@app/database';

import { auth } from './auth';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Account, Session, User, Verification } from './entities';

@Module({
  imports: [
    MikroOrmModule.forFeature([User, Account, Session, Verification]),
    DatabaseModule,
    BetterAuthModule.forRootAsync({
      useFactory: (orm: MikroORM) => ({ auth: auth(orm) }),
      inject: [MikroORM],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
