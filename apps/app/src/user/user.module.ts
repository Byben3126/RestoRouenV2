import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Person, UserProfile } from './entities';

@Module({
  imports: [MikroOrmModule.forFeature([Person, UserProfile])],
  providers: [],
  controllers: [],
})
export class UserModule {}
