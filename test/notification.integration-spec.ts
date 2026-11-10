/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplication } from '@nestjs/common';

import { MikroORM, RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import { NotificationPreferences } from '../src/modules/notification/entities/notification-preferences.entity';
import { Notification } from '../src/modules/notification/entities/notification.entity';
import { NotificationService } from '../src/modules/notification/notification.service';
import { AppUser } from '../src/modules/user/entities/app-user.entity';
import {
  TEST_USER_ID,
  cleanBaseFixtures,
  createTestApp,
  seedBaseFixtures,
} from './helpers/app.helper';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

const headingsOf = (items: { headings: { en: string } }[]) => items.map((n) => n.headings.en);

describe('UserNotificationController (integration)', () => {
  let app: INestApplication;
  let orm: MikroORM;
  let em: EntityManager;
  let restaurantId: string;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    orm = ctx.orm;
    em = ctx.em;
    ({ restaurantId } = await seedBaseFixtures(em));
  });

  afterEach(async () => {
    const fork = em.fork();
    await fork.nativeDelete(Notification, { user: TEST_USER_ID });
    await fork.nativeDelete(NotificationPreferences, { user: TEST_USER_ID });
  });

  afterAll(async () => {
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
  });

  /** Une notification par titre, de la plus ancienne à la plus récente */
  async function seedNotifications(...titles: string[]): Promise<Notification[]> {
    const fork = em.fork();
    const notifications = titles.map((title, i) =>
      fork.create(Notification, {
        user: fork.getReference(AppUser, TEST_USER_ID),
        restaurant: restaurantId,
        headings: { en: title },
        contents: { en: `${title} content` },
        data: { type: 'points.added', restaurantId },
        createdAt: new Date(Date.now() - (titles.length - i) * 1000),
      } as any),
    );
    await fork.flush();
    return notifications;
  }

  // ── Liste ───────────────────────────────────────────────────────────────────

  describe('GET /users/me/notifications', () => {
    it('lists the newest first, page by page, without duplicates', async () => {
      await seedNotifications('first', 'second', 'third');

      const page1 = await request(app.getHttpServer())
        .get('/users/me/notifications?limit=2')
        .expect(200);
      expect(headingsOf(page1.body.items)).toEqual(['third', 'second']);
      expect(page1.body.items[0]).toMatchObject({
        contents: { en: 'third content' },
        data: { type: 'points.added', restaurantId },
        restaurant: { id: restaurantId, name: 'Test Restaurant' },
        readAt: null,
      });
      expect(page1.body.nextCursor).toEqual(expect.any(String));

      const page2 = await request(app.getHttpServer())
        .get('/users/me/notifications')
        .query({ limit: 2, after: page1.body.nextCursor })
        .expect(200);
      expect(headingsOf(page2.body.items)).toEqual(['first']);
      expect(page2.body.nextCursor).toBeNull();
    });

    it('rejects an unreadable cursor', async () => {
      await request(app.getHttpServer())
        .get('/users/me/notifications?after=not-a-cursor')
        .expect(400);
    });
  });

  // ── Lecture ─────────────────────────────────────────────────────────────────

  describe('reading', () => {
    it('marks one notification as read', async () => {
      const [notification] = await seedNotifications('first', 'second');

      const res = await request(app.getHttpServer())
        .patch(`/users/me/notifications/${notification.id}/read`)
        .expect(200);
      expect(res.body).toMatchObject({ id: notification.id, readAt: expect.any(String) });

      // L'autre n'est pas lue
      const unread = await request(app.getHttpServer())
        .get('/users/me/notifications/has-unread')
        .expect(200);
      expect(unread.body).toEqual({ hasUnread: true });
    });

    it('returns 404 for a notification that does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/users/me/notifications/${UNKNOWN_ID}/read`)
        .expect(404);
    });

    it('marks every notification as read', async () => {
      await seedNotifications('first', 'second');

      await request(app.getHttpServer()).post('/users/me/notifications/read-all').expect(204);

      const unread = await request(app.getHttpServer())
        .get('/users/me/notifications/has-unread')
        .expect(200);
      expect(unread.body).toEqual({ hasUnread: false });
    });
  });

  // ── notify ──────────────────────────────────────────────────────────────────

  describe('NotificationService.notify', () => {
    /** notify passe par la file : la notification arrive en base une fois traitée par le worker */
    async function getSentNotifications(): Promise<unknown[]> {
      for (let i = 0; i < 100; i++) {
        const res = await request(app.getHttpServer()).get('/users/me/notifications').expect(200);
        if (res.body.items.length > 0) return res.body.items as unknown[];
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new Error('No notification sent after 10 s');
    }

    it('adds the notification to the center even when the user turned off the push', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/notification-preferences')
        .send({ points: false })
        .expect(200);

      await app.get(NotificationService).notify({
        userIds: [TEST_USER_ID],
        category: 'points',
        message: {
          headings: { en: '+50 points at Test Restaurant!' },
          contents: { en: 'Your balance: 150 points.' },
        },
        restaurantId,
      });

      const items = await getSentNotifications();
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        headings: { en: '+50 points at Test Restaurant!' },
        restaurant: { id: restaurantId },
      });
    });

    it('saves an app notification without restaurant', async () => {
      await app.get(NotificationService).notify({
        userIds: [TEST_USER_ID],
        category: 'promotions',
        message: {
          headings: { en: 'Welcome!' },
          contents: { en: 'Discover the restaurants around you.' },
        },
      });

      const [item] = await getSentNotifications();
      expect(item).toMatchObject({ restaurant: null, data: null });
    });
  });

  // ── Purge ───────────────────────────────────────────────────────────────────

  describe('NotificationService.purgeOld', () => {
    it('deletes the notifications older than 90 days', async () => {
      const [old] = await seedNotifications('old', 'recent');
      await em.fork().nativeUpdate(
        Notification,
        { id: old.id },
        {
          createdAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000),
        },
      );

      await RequestContext.create(orm.em, () => app.get(NotificationService).purgeOld());

      const res = await request(app.getHttpServer()).get('/users/me/notifications').expect(200);
      expect(headingsOf(res.body.items)).toEqual(['recent']);
    });
  });
});
