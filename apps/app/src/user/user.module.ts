import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { AuthGuard } from '../common/guards/auth.guard';
import { AppUser, Person } from './entities';
import { AppUserRepository } from './repositories/app-user.repository';
import { UserController } from './user.controller';
import { UserEventsController } from './user-events.controller';
import { UserService } from './user.service';

@Module({
  imports: [MikroOrmModule.forFeature([AppUser, Person])],
  controllers: [UserController, UserEventsController],
  providers: [UserService, AuthGuard, AppUserRepository],
})
export class UserModule {}
