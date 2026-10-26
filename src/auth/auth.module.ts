import { Module } from '@nestjs/common';

import { MikroORM } from '@mikro-orm/core';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';

import { EmailService } from '../onesignal/email.service';
import { OneSignalModule } from '../onesignal/onesignal.module';
import { UserModule } from '../user/user.module';
import { UserService } from '../user/user.service';
import { auth } from './auth';
import { Account, Session, User, Verification } from './entities';
import { ResetPasswordController } from './reset-password.controller';

@Module({
  imports: [
    MikroOrmModule.forFeature([User, Account, Session, Verification]),
    BetterAuthModule.forRootAsync({
      // Services appelés par les hooks : création du compte et envoi du code par email
      imports: [UserModule, OneSignalModule],
      useFactory: (orm: MikroORM, userService: UserService, emailService: EmailService) => ({
        auth: auth(orm, { userService, emailService }),
        // Le body brut est conservé pour la vérification de signature du webhook Stripe
        enableRawBodyParser: true,
        // Le CORS est configuré une seule fois dans main.ts
        disableTrustedOriginsCors: true,
      }),
      inject: [MikroORM, UserService, EmailService],
    }),
  ],
  controllers: [ResetPasswordController],
})
export class AuthModule {}
