import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { MikroORM } from '@mikro-orm/core';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly orm: MikroORM,
  ) {}

  async onModuleInit(): Promise<void> {
    const AdminJS = (await import('adminjs')).default;
    const { Database, Resource } = await import('@adminjs/mikroorm');
    const AdminJSExpress = (await import('@adminjs/express')).default;

    AdminJS.registerAdapter({ Database, Resource });

    const admin = new AdminJS({
      rootPath: '/admin',
      databases: [this.orm],
    });

    const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
      admin,
      {
        authenticate: async (email: string, password: string) => {
          if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            return { email };
          }
          return null;
        },
        cookiePassword: process.env.ADMIN_SECRET ?? 'changeme-admin-secret',
      },
      null,
      {
        resave: true,
        saveUninitialized: true,
        secret: process.env.ADMIN_SECRET ?? 'changeme-admin-secret',
      },
    );

    const { httpAdapter } = this.httpAdapterHost;
    httpAdapter.use('/admin', adminRouter);
  }
}
