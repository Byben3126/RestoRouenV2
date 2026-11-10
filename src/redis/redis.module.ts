import { Inject, Module, OnApplicationShutdown } from '@nestjs/common';

import { Redis } from 'ioredis';

import { redisConnection } from '../config/redis.config';
import { REDIS_CLIENT } from './redis.constants';

@Module({
  providers: [{ provide: REDIS_CLIENT, useFactory: () => new Redis(redisConnection()) }],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit();
  }
}
