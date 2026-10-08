/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { EntityManager } from '@mikro-orm/postgresql';
import request from 'supertest';

import { User } from '../src/auth/entities/user.entity';
import { Customer } from '../src/customer/entities/customer.entity';
import { PromotionTarget } from '../src/promotion/entities/promotion-target.entity';
import { PromotionUsed } from '../src/promotion/entities/promotion-used.entity';
import {
  Promotion,
  PromotionAudience,
  PromotionInternalStatus,
  PromotionStatus,
} from '../src/promotion/entities/promotion.entity';
import { Restaurant } from '../src/restaurant/entities/restaurant.entity';
import { AppUser } from '../src/user/entities/app-user.entity';
import {
  TEST_USER_ID,
  cleanBaseFixtures,
  createTestApp,
  seedBaseFixtures,
} from './helpers/app.helper';

describe('PromotionController (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;
  let restaurantId: string;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    em = ctx.em;
    ({ restaurantId } = await seedBaseFixtures(em));
  });

  afterAll(async () => {
    await em.fork().nativeDelete(Promotion, { restaurant: restaurantId });
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
  });

  afterEach(async () => {
    await em.fork().nativeDelete(Promotion, { restaurant: restaurantId });
  });

  const BASE_DTO = { name: 'Happy Hour', audience: PromotionAudience.ALL };

  // ── GET /promotions ─────────────────────────────────────────────────────────

  describe('GET /promotions', () => {
    it('returns 200 with empty list when no promotions exist', async () => {
      const res = await request(app.getHttpServer()).get('/promotions').expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('returns promotions after creation', async () => {
      await request(app.getHttpServer()).post('/promotions').send(BASE_DTO);

      const res = await request(app.getHttpServer()).get('/promotions').expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Happy Hour');
    });
  });

  // ── POST /promotions ────────────────────────────────────────────────────────

  describe('POST /promotions', () => {
    it('creates a promotion and returns 201', async () => {
      const res = await request(app.getHttpServer()).post('/promotions').send(BASE_DTO).expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe('Happy Hour');
      expect(res.body.data.audience).toBe(PromotionAudience.ALL);
      expect(res.body.data.status).toBe(PromotionStatus.ACTIVE);
    });

    it('creates a promotion with DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .post('/promotions')
        .send({ ...BASE_DTO, status: PromotionInternalStatus.DRAFT })
        .expect(201);

      expect(res.body.data.status).toBe(PromotionStatus.DRAFT);
    });

    it('creates an INACTIVE audience promotion', async () => {
      const res = await request(app.getHttpServer())
        .post('/promotions')
        .send({ name: 'Promo inactifs', audience: PromotionAudience.INACTIVE })
        .expect(201);

      expect(res.body.data.audience).toBe(PromotionAudience.INACTIVE);
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/promotions')
        .send({ audience: PromotionAudience.ALL })
        .expect(400);
    });

    it('returns 400 when audience is invalid', async () => {
      await request(app.getHttpServer())
        .post('/promotions')
        .send({ name: 'Test', audience: 'invalid' })
        .expect(400);
    });

    it('returns 400 when a customer is targeted twice', async () => {
      await request(app.getHttpServer())
        .post('/promotions')
        .send({ ...BASE_DTO, audience: PromotionAudience.TARGETED, customerIds: ['c-1', 'c-1'] })
        .expect(400);
    });
  });

  // ── GET /restaurant/:restaurantId/promotions ────────────────────────────────

  describe('GET /restaurant/:restaurantId/promotions', () => {
    const OTHER_USER_ID = 'promotion-other-user';
    const DAY = 86_400_000;
    let otherCustomerId: string;

    beforeAll(async () => {
      const fork = em.fork();
      const user = fork.create(User, {
        id: OTHER_USER_ID,
        name: 'Other User',
        email: 'promotion-other@test.com',
        emailVerified: true,
      } as any);
      const appUser = fork.create(AppUser, { authUser: user } as any);
      const customer = fork.create(Customer, { user: appUser, restaurant: restaurantId } as any);
      await fork.flush();
      otherCustomerId = customer.id;
    });

    afterEach(async () => {
      const fork = em.fork();
      await fork.nativeDelete(PromotionUsed, { promotion: { restaurant: restaurantId } });
      await fork.nativeDelete(PromotionTarget, { promotion: { restaurant: restaurantId } });
      await fork.nativeDelete(Customer, { user: TEST_USER_ID });
    });

    afterAll(async () => {
      const fork = em.fork();
      await fork.nativeDelete(Customer, { user: OTHER_USER_ID });
      await fork.nativeDelete(AppUser, { authUser: OTHER_USER_ID });
      await fork.nativeDelete(User, { id: OTHER_USER_ID });
    });

    /**
     * Crée les promotions des différents cas. Avec `me`, l'utilisateur de test devient client
     * (ciblé par « Rien que pour moi », a utilisé « Déjà utilisée ») ; sinon c'est l'autre client.
     */
    async function seedPromotions(me?: { lastVisitDate: Date | null }) {
      const fork = em.fork();
      const customer = me
        ? fork.create(Customer, { user: TEST_USER_ID, restaurant: restaurantId, ...me } as any)
        : otherCustomerId;
      const promo = (name: string, data: Record<string, unknown> = {}) =>
        fork.create(Promotion, {
          restaurant: restaurantId,
          name,
          audience: PromotionAudience.ALL,
          ...data,
        } as any);

      promo('Pour tous');
      promo('Pour tous, déjà commencée', { scheduledAt: new Date(Date.now() - DAY) });
      promo('Brouillon', { internalStatus: PromotionInternalStatus.DRAFT });
      promo('Expirée', { expiresAt: new Date(Date.now() - DAY) });
      promo('À venir', { scheduledAt: new Date(Date.now() + DAY) });
      promo('Inactifs', { audience: PromotionAudience.INACTIVE });
      const forMe = promo('Rien que pour moi', { audience: PromotionAudience.TARGETED });
      const forOther = promo('Pour un autre', { audience: PromotionAudience.TARGETED });
      const used = promo('Déjà utilisée');
      fork.create(PromotionTarget, { promotion: forMe, customer } as any);
      fork.create(PromotionTarget, { promotion: forOther, customer: otherCustomerId } as any);
      fork.create(PromotionUsed, { promotion: used, customer } as any);
      await fork.flush();
    }

    const getPromotions = (id = restaurantId) =>
      request(app.getHttpServer()).get(`/restaurant/${id}/promotions`);
    const namesOf = (res: request.Response) =>
      (res.body.data as { name: string }[]).map((p) => p.name).sort();

    it('shows only promotions for everyone when the user is not a customer', async () => {
      await seedPromotions();

      const res = await getPromotions().expect(200);

      expect(namesOf(res)).toEqual(['Déjà utilisée', 'Pour tous', 'Pour tous, déjà commencée']);
    });

    it('adds the promotions targeting an inactive customer and hides used ones', async () => {
      await seedPromotions({ lastVisitDate: new Date(Date.now() - 60 * DAY) });

      const res = await getPromotions().expect(200);

      expect(namesOf(res)).toEqual([
        'Inactifs',
        'Pour tous',
        'Pour tous, déjà commencée',
        'Rien que pour moi',
      ]);
    });

    it('hides INACTIVE promotions from an active customer', async () => {
      await seedPromotions({ lastVisitDate: new Date() });

      const res = await getPromotions().expect(200);

      expect(namesOf(res)).toEqual(['Pour tous', 'Pour tous, déjà commencée', 'Rien que pour moi']);
    });

    it('does not expose owner-only fields', async () => {
      await seedPromotions({ lastVisitDate: new Date() });

      const res = await getPromotions().expect(200);

      const promotion = (res.body.data as Record<string, unknown>[])[0];
      expect(promotion).toHaveProperty('audience');
      expect(promotion).not.toHaveProperty('targetedCustomers');
      expect(promotion).not.toHaveProperty('usedCount');
      expect(promotion).not.toHaveProperty('targetCount');
    });

    it('returns 404 for an unknown restaurant', async () => {
      await getPromotions('00000000-0000-0000-0000-000000000000').expect(404);
    });

    it('returns 400 when the restaurant id is not a UUID', async () => {
      await getPromotions('abc').expect(400);
    });
  });

  // ── GET /users/me/promotions(/targeted) ─────────────────────────────────────

  describe('GET /users/me/promotions', () => {
    const OWNER_B_ID = 'promotion-owner-b';
    const DAY = 86_400_000;
    let restaurantBId: string;

    beforeAll(async () => {
      const fork = em.fork();
      const user = fork.create(User, {
        id: OWNER_B_ID,
        name: 'Owner B',
        email: 'promotion-owner-b@test.com',
        emailVerified: true,
      } as any);
      const appUser = fork.create(AppUser, { authUser: user } as any);
      const restaurantB = fork.create(Restaurant, { user: appUser, name: 'Restaurant B' } as any);
      await fork.flush();
      restaurantBId = restaurantB.id;
    });

    beforeEach(async () => {
      const fork = em.fork();
      // Client inactif du restaurant A, actif du restaurant B
      const meA = fork.create(Customer, {
        user: TEST_USER_ID,
        restaurant: restaurantId,
        lastVisitDate: new Date(Date.now() - 60 * DAY),
      } as any);
      fork.create(Customer, {
        user: TEST_USER_ID,
        restaurant: restaurantBId,
        lastVisitDate: new Date(),
      } as any);
      const promo = (restaurant: string, name: string, data: Record<string, unknown> = {}) =>
        fork.create(Promotion, {
          restaurant,
          name,
          audience: PromotionAudience.ALL,
          ...data,
        } as any);

      promo(restaurantId, 'A pour tous');
      promo(restaurantId, 'A expirée', { expiresAt: new Date(Date.now() - DAY) });
      const usedA = promo(restaurantId, 'A utilisée');
      const targetedA = promo(restaurantId, 'A ciblée', { audience: PromotionAudience.TARGETED });
      promo(restaurantId, 'A inactifs', { audience: PromotionAudience.INACTIVE });
      promo(restaurantBId, 'B pour tous');
      promo(restaurantBId, 'B à venir', { scheduledAt: new Date(Date.now() + DAY) });
      promo(restaurantBId, 'B inactifs', { audience: PromotionAudience.INACTIVE });
      fork.create(PromotionTarget, { promotion: targetedA, customer: meA } as any);
      fork.create(PromotionUsed, { promotion: usedA, customer: meA } as any);
      await fork.flush();
    });

    afterEach(async () => {
      const fork = em.fork();
      const restaurants = { $in: [restaurantId, restaurantBId] };
      await fork.nativeDelete(PromotionUsed, { promotion: { restaurant: restaurants } });
      await fork.nativeDelete(PromotionTarget, { promotion: { restaurant: restaurants } });
      await fork.nativeDelete(Promotion, { restaurant: restaurantBId });
      await fork.nativeDelete(Customer, { user: TEST_USER_ID });
    });

    afterAll(async () => {
      const fork = em.fork();
      await fork.nativeDelete(Restaurant, { id: restaurantBId });
      await fork.nativeDelete(AppUser, { authUser: OWNER_B_ID });
      await fork.nativeDelete(User, { id: OWNER_B_ID });
    });

    type UserPromotion = { name: string; restaurant: { id: string; name: string } };
    /** Ne garde que les promotions des restaurants du test (la base peut en contenir d'autres) */
    const ownItems = (res: request.Response) =>
      (res.body.data.items as UserPromotion[]).filter((p) =>
        [restaurantId, restaurantBId].includes(p.restaurant.id),
      );

    it('returns all the available promotions of every restaurant, with their restaurant', async () => {
      const res = await request(app.getHttpServer()).get('/users/me/promotions').expect(200);

      const items = ownItems(res);
      expect(items.map((p) => p.name).sort()).toEqual([
        'A ciblée',
        'A inactifs',
        'A pour tous',
        'B pour tous',
      ]);
      expect(items.find((p) => p.name === 'B pour tous')!.restaurant.name).toBe('Restaurant B');
      expect(items[0]).not.toHaveProperty('targetedCustomers');
    });

    it('returns the promotions targeting the user (TARGETED and INACTIVE where inactive)', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/promotions/targeted')
        .expect(200);

      expect(
        ownItems(res)
          .map((p) => p.name)
          .sort(),
      ).toEqual(['A ciblée', 'A inactifs']);
    });

    it('paginates the results', async () => {
      const res = await request(app.getHttpServer())
        .get('/users/me/promotions/targeted')
        .query({ page: 2, limit: 1 })
        .expect(200);

      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data).toMatchObject({ page: 2, limit: 1 });
      expect(res.body.data.total).toBeGreaterThanOrEqual(2);
    });

    it('returns 400 when limit exceeds 50', async () => {
      await request(app.getHttpServer())
        .get('/users/me/promotions')
        .query({ limit: 51 })
        .expect(400);
    });

    /** Id de la promotion du test portant ce nom */
    const promotionId = async (name: string) => {
      const restaurant = { $in: [restaurantId, restaurantBId] };
      return (await em.fork().findOneOrFail(Promotion, { name, restaurant })).id;
    };

    it('returns a signed token for a promotion available to the user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/users/me/promotions/${await promotionId('A ciblée')}/token`)
        .expect(200);

      expect(typeof res.body.data.token).toBe('string');
      expect(new Date(res.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it.each(['A utilisée', 'A expirée', 'B à venir', 'B inactifs'])(
      'returns 404 for a token on a promotion not available to the user (%s)',
      async (name) => {
        await request(app.getHttpServer())
          .get(`/users/me/promotions/${await promotionId(name)}/token`)
          .expect(404);
      },
    );

    // ── POST /promotions/use (le restaurant A scanne le token) ─────────────────

    const tokenFor = async (name: string) => {
      const res = await request(app.getHttpServer())
        .get(`/users/me/promotions/${await promotionId(name)}/token`)
        .expect(200);
      return res.body.data.token as string;
    };

    it('marks the promotion as used, only once', async () => {
      const token = await tokenFor('A ciblée');

      const res = await request(app.getHttpServer())
        .post('/promotions/use')
        .send({ token })
        .expect(200);

      expect(res.body.data.name).toBe('A ciblée');
      const usages = await em.fork().count(PromotionUsed, {
        promotion: { name: 'A ciblée', restaurant: restaurantId },
        customer: { user: TEST_USER_ID },
      });
      expect(usages).toBe(1);
      // Utiliser une promotion compte comme une visite : le client inactif redevient actif
      const customer = await em
        .fork()
        .findOneOrFail(Customer, { user: TEST_USER_ID, restaurant: restaurantId });
      expect(customer.isInactive).toBe(false);

      await request(app.getHttpServer()).post('/promotions/use').send({ token }).expect(409);
    });

    it('returns 409 when the user has no access to the promotion of a valid token', async () => {
      const fork = em.fork();
      const other = fork.create(Promotion, {
        restaurant: restaurantId,
        name: 'A ciblée pour un autre',
        audience: PromotionAudience.TARGETED,
      } as any);
      await fork.flush();
      // Token signé par le serveur, mais l'utilisateur ne fait pas partie des cibles
      const token = await app
        .get(JwtService, { strict: false })
        .signAsync({ sub: TEST_USER_ID, promotionId: other.id });

      await request(app.getHttpServer()).post('/promotions/use').send({ token }).expect(409);
      expect(await em.fork().count(PromotionUsed, { promotion: other.id })).toBe(0);
    });

    it('returns 403 when the promotion belongs to another restaurant', async () => {
      const token = await tokenFor('B pour tous');

      await request(app.getHttpServer()).post('/promotions/use').send({ token }).expect(403);
    });

    it('returns 400 when the token is not a valid signed token', async () => {
      const token = await tokenFor('A pour tous');
      const [header, payload] = token.split('.');

      await request(app.getHttpServer())
        .post('/promotions/use')
        .send({ token: `${header}.${payload}.signature-falsifiee` })
        .expect(400);
      await request(app.getHttpServer()).post('/promotions/use').send({}).expect(400);
    });
  });

  // ── PATCH /promotions/:id ───────────────────────────────────────────────────

  describe('PATCH /promotions/:id', () => {
    let promotionId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer()).post('/promotions').send(BASE_DTO);
      promotionId = res.body.data.id;
    });

    it('updates the promotion name', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/promotions/${promotionId}`)
        .send({ name: 'Nouveau nom', audience: PromotionAudience.ALL })
        .expect(200);

      expect(res.body.data.name).toBe('Nouveau nom');
    });
  });

  // ── PATCH /promotions/:id/archive ───────────────────────────────────────────

  describe('PATCH /promotions/:id/archive', () => {
    let promotionId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer()).post('/promotions').send(BASE_DTO);
      promotionId = res.body.data.id;
    });

    it('archives the promotion', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/promotions/${promotionId}/archive`)
        .expect(200);

      expect(res.body.data.status).toBe(PromotionStatus.ARCHIVED);
    });
  });

  // ── PATCH /promotions/:id/draft ─────────────────────────────────────────────

  describe('PATCH /promotions/:id/draft', () => {
    let promotionId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/promotions')
        .send({ ...BASE_DTO, status: PromotionInternalStatus.ACTIVE });
      promotionId = res.body.data.id;
    });

    it('sets promotion to draft', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/promotions/${promotionId}/draft`)
        .expect(200);

      expect(res.body.data.status).toBe(PromotionStatus.DRAFT);
    });
  });

  // ── PATCH /promotions/:id/publish ───────────────────────────────────────────

  describe('PATCH /promotions/:id/publish', () => {
    let promotionId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/promotions')
        .send({ ...BASE_DTO, status: PromotionInternalStatus.DRAFT });
      promotionId = res.body.data.id;
    });

    it('publishes the promotion', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/promotions/${promotionId}/publish`)
        .expect(200);

      expect(res.body.data.status).toBe(PromotionStatus.ACTIVE);
    });
  });
});
