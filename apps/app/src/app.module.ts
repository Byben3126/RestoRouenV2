import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { DatabaseModule } from '@app/database';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RestaurantModule } from './restaurant/restaurant.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [DatabaseModule, EventEmitterModule.forRoot(), UserModule, RestaurantModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
