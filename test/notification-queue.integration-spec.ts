/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/postgresql';
import { Job, Queue } from 'bullmq';
import request from 'supertest';

import { User } from '../src/modules/auth/entities/user.entity';
import { Customer } from '../src/modules/customer/entities/customer.entity';
import { PointsTransaction } from '../src/modules/customer/entities/points-transaction.entity';
import { Notification } from '../src/modules/notification/entities/notification.entity';
import { RATING_REQUEST_DELAY_MS } from '../src/modules/notification/listeners/customer-points.listener';
import { NOTIFICATIONS_QUEUE } from '../src/modules/notification/queue/notification.constants';
import { AppUser } from '../src/modules/user/entities/app-user.entity';
import { cleanBaseFixtures, createTestApp, seedBaseFixtures } from './helpers/app.helper';

const CUSTOMER_USER_ID = 'test-queue-customer-user';

describe('Notification queue (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;
  let queue: Queue;
  let restaurantId: string;
  let customerId: string;

  const ratingKey = () => `rating-request-${CUSTOMER_USER_ID}-${restaurantId}`;

  /** Demandes d'avis de ce client encore dans la file (programmées, en attente ou en cours) */
  async function findRatingJobs(): Promise<Job[]> {
    const jobs = await queue.getJobs(['delayed', 'waiting', 'active']);
    return jobs.filter((job) => job.opts.deduplication?.id === ratingKey());
  }

  /** Les notifications sont envoyées par le worker : on attend qu'elles arrivent en base */
  async function waitForNotifications(type: string, count = 1): Promise<Notification[]> {
    for (let i = 0; i < 100; i++) {
      const notifications = (
        await em.fork().find(Notification, { user: { authUser: CUSTOMER_USER_ID } })
      ).filter((n) => (n.data as { type?: string } | undefined)?.type === type);
      if (notifications.length >= count) return notifications;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Fewer than ${count} "${type}" notifications after 10 s`);
  }

  function addPoints() {
    return request(app.getHttpServer())
      .post(`/customers/${customerId}/points`)
      .send({ amount: 10, reason: 'Repas' })
      .expect(201);
  }

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    em = ctx.em;
    queue = app.get(getQueueToken(NOTIFICATIONS_QUEUE));
    ({ restaurantId } = await seedBaseFixtures(em));

    const fork = em.fork();
    fork.create(User, {
      id: CUSTOMER_USER_ID,
      name: 'Queue Customer',
      email: 'queue-customer@test.com',
      emailVerified: false,
    } as any);
    fork.create(AppUser, { authUser: fork.getReference(User, CUSTOMER_USER_ID) } as any);
    await fork.flush();
    const customer = fork.create(Customer, {
      user: await fork.findOneOrFail(AppUser, { authUser: CUSTOMER_USER_ID }),
      restaurant: restaurantId,
    } as any);
    await fork.flush();
    customerId = customer.id;
  });

  afterAll(async () => {
    // Un job en cours ne peut pas être supprimé : on attend la fin de ceux que le worker traite
    for (const job of await findRatingJobs()) {
      for (let i = 0; i < 50 && (await job.getState()) === 'active'; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await job.remove();
    }
    const fork = em.fork();
    await fork.nativeDelete(Notification, { user: { authUser: CUSTOMER_USER_ID } });
    // Par utilisateur plutôt que par id : nettoie aussi ce qu'un run interrompu a laissé
    await fork.nativeDelete(PointsTransaction, { customer: { user: CUSTOMER_USER_ID } });
    await fork.nativeDelete(Customer, { user: CUSTOMER_USER_ID });
    await fork.nativeDelete(AppUser, { authUser: CUSTOMER_USER_ID });
    await fork.nativeDelete(User, { id: CUSTOMER_USER_ID });
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
  });

  it('sends the points notification through the queue', async () => {
    await addPoints();

    const [notification] = await waitForNotifications('points.added');
    expect(notification.headings).toMatchObject({ fr: expect.stringContaining('+10 points') });
  });

  it('keeps a single rating request, 20 minutes after the first visit', async () => {
    const [first] = await findRatingJobs();
    expect(await first.getState()).toBe('delayed');
    expect(first.delay).toBe(RATING_REQUEST_DELAY_MS);

    await addPoints();
    await waitForNotifications('points.added', 2);

    const jobs = await findRatingJobs();
    expect(jobs.map((job) => job.id)).toEqual([first.id]);
  });

  it('sends the rating request when it is due', async () => {
    const [job] = await findRatingJobs();
    await job.promote();

    const [notification] = await waitForNotifications('rating.request');
    expect(notification.headings).toMatchObject({ fr: expect.stringContaining('Comment s') });
  });

  it('schedules a new rating request on a visit after the previous one was sent', async () => {
    // La clé est libérée quand le worker a terminé le job, juste après l'envoi
    for (let i = 0; i < 50 && (await findRatingJobs()).length > 0; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    await addPoints();
    await waitForNotifications('points.added', 3);

    // Le listener est asynchrone : on attend que la nouvelle demande soit programmée
    let jobs: Job[] = [];
    for (let i = 0; i < 50 && jobs.length === 0; i++) {
      jobs = (await findRatingJobs()).filter((job) => job.delay === RATING_REQUEST_DELAY_MS);
      if (jobs.length === 0) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(jobs).toHaveLength(1);
    expect(await jobs[0].getState()).toBe('delayed');
  });
});
