import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Worker } from './entities';

// Import direct de la classe

@Module({
  imports: [MikroOrmModule.forFeature([Worker])],
  providers: [],
  controllers: [],
})
export class WorkerModule {}
