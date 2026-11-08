import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import type { Queue } from 'bullmq';
import { type RequestHandler, Router } from 'express';

import { NOTIFICATIONS_QUEUE } from '../notification/queue/notification.constants';

/** Router Express de Bull Board, injecté dans DevController */
export const QUEUE_BOARD_ROUTER = Symbol('QUEUE_BOARD_ROUTER');

/** Files affichées dans Bull Board */
export const BOARD_QUEUES = [NOTIFICATIONS_QUEUE];

/** Construit Bull Board, monté sous /dev/queues, pour les files reçues (dans l'ordre de BOARD_QUEUES) */
export function createQueueBoardRouter(...queues: Queue[]): Router {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/dev/queues');
  createBullBoard({ queues: queues.map((queue) => new BullMQAdapter(queue)), serverAdapter });
  return Router().use('/dev/queues', serverAdapter.getRouter() as RequestHandler);
}
