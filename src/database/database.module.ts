import { Global, Module, OnModuleInit } from '@nestjs/common';

import { MikroORM } from '@mikro-orm/core';
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
export class DatabaseModule implements OnModuleInit {
  constructor(private readonly orm: MikroORM) {}

  async onModuleInit() {
    const connection = this.orm.em.getConnection();

    // Add extensions for PostgreSQL
    await connection.execute('create extension if not exists unaccent');
    await connection.execute('create extension if not exists pg_trgm');
  }
}