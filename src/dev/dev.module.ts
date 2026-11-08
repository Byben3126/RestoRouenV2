import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { DevController } from './dev.controller';
import { BOARD_QUEUES, QUEUE_BOARD_ROUTER, createQueueBoardRouter } from './queue-board.router';

@Module({
  // Pour injecter les files suivies : leurs modules ne les exportent pas
  imports: BOARD_QUEUES.map((name) => BullModule.registerQueue({ name })),
  controllers: [DevController],
  providers: [
    {
      provide: QUEUE_BOARD_ROUTER,
      inject: BOARD_QUEUES.map((name) => getQueueToken(name)),
      useFactory: createQueueBoardRouter,
    },
  ],
})
export class DevModule {}
