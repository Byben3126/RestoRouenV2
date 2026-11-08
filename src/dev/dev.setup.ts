import { getQueueToken } from '@nestjs/bullmq';
import type { INestApplication } from '@nestjs/common';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Queue } from 'bullmq';
import type { NextFunction, Request, Response } from 'express';

import { auth } from '../auth/auth';
import { NOTIFICATIONS_QUEUE } from '../notification/queue/notification.constants';

type AppAuthService = AuthService<ReturnType<typeof auth>>;

/** Files affichées dans Bull Board */
const QUEUES = [NOTIFICATIONS_QUEUE];

// Comme pour /admin : session obligatoire, mais rôle "dev".
function createDevAccessMiddleware(authService: AppAuthService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    let session: Awaited<ReturnType<typeof authService.api.getSession>> = null;
    try {
      session = await authService.api.getSession({ headers: fromNodeHeaders(req.headers) });
    } catch (err) {
      console.error('[dev] getSession threw:', err);
    }

    if (!session) {
      res.status(401).json({ statusCode: 401, message: 'Unauthorized' });
      return;
    }

    if ((session.user as { role?: string }).role !== 'dev') {
      res.status(403).json({ statusCode: 403, message: 'Forbidden' });
      return;
    }

    next();
  };
}

/** Outils de dev : Bull Board, pour suivre les files BullMQ (/dev/queues) */
export function setupDev(app: INestApplication): void {
  const authService = app.get<AppAuthService>(AuthService);

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/dev/queues');
  createBullBoard({
    queues: QUEUES.map((name) => new BullMQAdapter(app.get<Queue>(getQueueToken(name)))),
    serverAdapter,
  });

  app.use('/dev/queues', createDevAccessMiddleware(authService), serverAdapter.getRouter());
}
