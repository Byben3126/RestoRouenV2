/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { getQueueToken } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/postgresql';
import { Job, Queue } from 'bullmq';
import request from 'supertest';

import { User } from '../src/auth/entities/user.entity';
import { Customer } from '../src/customer/entities/customer.entity';
import { PointsTransaction } from '../src/customer/entities/points-transaction.entity';
import { Notification } from '../src/notification/entities/notification.entity';
import { RATING_REQUEST_DELAY_MS } from '../src/notification/listeners/customer-points.listener';
import { NOTIFICATIONS_QUEUE } from '../src/notification/queue/notification.constants';
import { AppUser } from '../src/user/entities/app-user.entity';
import { cleanBaseFixtures, createTestApp, seedBaseFixtures } from './helpers/app.helper';

const CUSTOMER_USER_ID = 'test-queue-customer-user';

describe('Notification queue (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;
  let queue: Queue;
  let restaurantId: string;
  let customerId: string;

  const ratingKey = () => `rating-request-${CUSTOMER_USER_ID}-${restaurantId}`;

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
    await (await queue.getJob(ratingKey()))?.remove();
    const fork = em.fork();
    await fork.nativeDelete(Notification, { user: { authUser: CUSTOMER_USER_ID } });
    await fork.nativeDelete(PointsTransaction, { customer: customerId });
    await fork.nativeDelete(Customer, { id: customerId });
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
    const first = (await queue.getJob(ratingKey())) as Job;
    expect(await first.getState()).toBe('delayed');
    expect(first.delay).toBe(RATING_REQUEST_DELAY_MS);

    await addPoints();
    await waitForNotifications('points.added', 2);

    const delayed = (await queue.getDelayed()).filter((job) => job.id === ratingKey());
    expect(delayed).toHaveLength(1);
    expect(delayed[0].timestamp).toBe(first.timestamp);
  });

  it('sends the rating request when it is due', async () => {
    await (await queue.getJob(ratingKey()))!.promote();

    const [notification] = await waitForNotifications('rating.request');
    expect(notification.headings).toMatchObject({ fr: expect.stringContaining('Comment s') });
  });
});
