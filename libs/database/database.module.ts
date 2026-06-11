import { Global, Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import config from './config/mikro-orm.app.config';

@Global()
@Module({
  imports: [
    MikroOrmModule.forRoot({
      autoLoadEntities: true,
      ...config,
    }),
  ],
})
export class DatabaseModule {}
