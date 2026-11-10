import { Module } from '@nestjs/common';

import { RedisModule } from '../../infrastructure/redis/redis.module';
import { GoogleController } from './google.controller';
import { GoogleService } from './google.service';

@Module({
  imports: [RedisModule],
  controllers: [GoogleController],
  providers: [GoogleService],
})
export class GoogleModule {}
