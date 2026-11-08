import { Module } from '@nestjs/common';

import { MikroORM } from '@mikro-orm/core';

import { AdminController } from './admin.controller';
import { ADMIN_ROUTER, createAdminRouter } from './admin.router';

@Module({
  controllers: [AdminController],
  providers: [{ provide: ADMIN_ROUTER, inject: [MikroORM], useFactory: createAdminRouter }],
})
export class AdminModule {}
