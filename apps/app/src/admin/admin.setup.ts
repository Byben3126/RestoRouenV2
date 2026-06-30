import type { INestApplication } from '@nestjs/common';

import AdminJSExpress from '@adminjs/express';
import { Database, Resource } from '@adminjs/mikroorm';
import { MikroORM } from '@mikro-orm/core';
import AdminJS from 'adminjs';

export function setupAdmin(app: INestApplication): void {
  const orm = app.get(MikroORM);

  AdminJS.registerAdapter({ Database, Resource });

  const admin = new AdminJS({
    rootPath: '/admin',
    databases: [orm],
  });

  const adminRouter = AdminJSExpress.buildRouter(admin);

  app.use('/admin', adminRouter);
}
