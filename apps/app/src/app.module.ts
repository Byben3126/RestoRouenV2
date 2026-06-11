import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { DatabaseModule } from '@app/database';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WorkerModule } from './workers/worker.module';

@Module({
  imports: [DatabaseModule, EventEmitterModule.forRoot(), WorkerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
