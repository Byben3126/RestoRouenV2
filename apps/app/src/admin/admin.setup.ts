import type { INestApplication } from '@nestjs/common';

import { MikroORM } from '@mikro-orm/core';

export async function setupAdmin(app: INestApplication): Promise<void> {
  const orm = app.get(MikroORM);

  const AdminJS = (await import('adminjs')).default;
  const { Database, Resource } = await import('@adminjs/mikroorm');
  const AdminJSExpress = (await import('@adminjs/express')).default;

  AdminJS.registerAdapter({ Database, Resource });

  const admin = new AdminJS({
    rootPath: '/admin',
    databases: [orm],
  });

  const adminRouter = AdminJSExpress.buildRouter(admin);

  app.use('/admin', adminRouter);
}
