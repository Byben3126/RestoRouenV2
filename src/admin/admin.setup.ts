import type { INestApplication } from '@nestjs/common';

import AdminJSExpress from '@adminjs/express';
import { Database, Resource } from '@adminjs/mikroorm';
import { MikroORM } from '@mikro-orm/core';
import { AuthService } from '@thallesp/nestjs-better-auth';
import AdminJS from 'adminjs';
import { fromNodeHeaders } from 'better-auth/node';
import type { NextFunction, Request, Response } from 'express';

import { auth } from '../auth/auth';

type AppAuthService = AuthService<ReturnType<typeof auth>>;

// Reprend les anciens middlewares auth + admin du gateway : session obligatoire et rôle "admin".
function createAdminAccessMiddleware(authService: AppAuthService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    let session: Awaited<ReturnType<typeof authService.api.getSession>> = null;
    try {
      session = await authService.api.getSession({ headers: fromNodeHeaders(req.headers) });
    } catch (err) {
      console.error('[admin] getSession threw:', err);
    }

    if (!session) {
      res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
      return;
    }

    if ((session.user as { role?: string }).role !== 'admin') {
      res.status(403).json({ statusCode: 403, message: 'Forbidden' });
      return;
    }

    next();
  };
}

export function setupAdmin(app: INestApplication): void {
  const orm = app.get(MikroORM);
  const authService = app.get<AppAuthService>(AuthService);

  AdminJS.registerAdapter({ Database, Resource });

  const admin = new AdminJS({
    rootPath: '/admin',
    databases: [orm],
  });

  const adminRouter = AdminJSExpress.buildRouter(admin);

  app.use('/admin', createAdminAccessMiddleware(authService), adminRouter);
}
