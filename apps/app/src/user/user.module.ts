import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { User } from '@app/auth/entities/user.entity';
import { Person, UserProfile } from './entities';
import { AuthGuard } from '../common/guards/auth.guard';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [MikroOrmModule.forFeature([Person, UserProfile, User])],
  controllers: [UserController],
  providers: [UserService, AuthGuard],
})
export class UserModule {}
