import { Module } from '@nestjs/common';

import { RealtimeGateway } from './realtime.gateway';
import { RealtimeListener } from './realtime.listener';

@Module({
  providers: [RealtimeGateway, RealtimeListener],
})
export class RealtimeModule {}
