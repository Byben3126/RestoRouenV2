import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Person } from './entities';

@Module({
  imports: [MikroOrmModule.forFeature([Person])],
  providers: [],
  controllers: [],
})
export class PersonModule {}
