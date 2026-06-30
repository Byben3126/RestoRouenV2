import type { INestApplication } from '@nestjs/common';

import { MikroORM } from '@mikro-orm/core';
import AdminJS from 'adminjs';
import { Database, Resource } from '@adminjs/mikroorm';
import AdminJSExpress from '@adminjs/express';

export async function setupAdmin(app: INestApplication): Promise<void> {
  const orm = app.get(MikroORM);

  AdminJS.registerAdapter({ Database, Resource });

  const admin = new AdminJS({
    rootPath: '/admin',
    databases: [orm],
  });

  const adminRouter = AdminJSExpress.buildRouter(admin);

  app.use('/admin', adminRouter);
}
