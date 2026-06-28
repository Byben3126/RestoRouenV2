import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { DatabaseModule } from '@app/database';

import { Account } from '../../auth/src/entities/account.entity';
import { Session } from '../../auth/src/entities/session.entity';
import { User } from '../../auth/src/entities/user.entity';
import { Verification } from '../../auth/src/entities/verification.entity';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [DatabaseModule, MikroOrmModule.forFeature([User, Session, Account, Verification])],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
