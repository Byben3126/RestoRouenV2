import { Module } from '@nestjs/common';

import { TabletListener } from './listeners/tablet.listener';
import { UserListener } from './listeners/user.listener';
import { TabletGateway } from './tablet.gateway';
import { UserGateway } from './user.gateway';

@Module({
  providers: [UserGateway, UserListener, TabletGateway, TabletListener],
})
export class RealtimeModule {}
