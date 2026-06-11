import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { UserProfile } from './entities';

@Module({
  imports: [MikroOrmModule.forFeature([UserProfile])],
  providers: [],
  controllers: [],
})
export class UserProfileModule {}
