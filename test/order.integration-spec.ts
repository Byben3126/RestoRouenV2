import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { EntityManager } from '@mikro-orm/postgresql';
import { AuthService as BetterAuthService } from '@thallesp/nestjs-better-auth';
import { randomUUID } from 'crypto';
import request from 'supertest';

import { User } from '../src/modules/auth/entities/user.entity';
import { Customer } from '../src/modules/customer/entities/customer.entity';
import {
  PointsTransaction,
  PointsTransactionType,
} from '../src/modules/customer/entities/points-transaction.entity';
import { Order, PendingPoints } from '../src/modules/hubrise/entities';
import { AppUser } from '../src/modules/user/entities/app-user.entity';
import {
  TEST_USER_ID,
  cleanBaseFixtures,
  createTestApp,
  seedBaseFixtures,
} from './helpers/app.helper';

const ORDER_TOKEN_SECRET = 'order-token-secret';
/** Email vérifié de l'utilisateur de test (seedUserOnly) */
const TEST_USER_EMAIL = 'integration@test.com';
const UNVERIFIED_USER_ID = 'order-unverified-user';
const UNVERIFIED_USER_EMAIL = 'order-unverified@test.com';

describe('Order points claim (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;
  let restaurantId: string;
  let getSession: jest.Mock;
  const previousSecret = process.env.ORDER_TOKEN_SECRET;

  beforeAll(async () => {
    process.env.ORDER_TOKEN_SECRET = ORDER_TOKEN_SECRET;
    const ctx = await createTestApp();
    app = ctx.app;
    em = ctx.em;
    getSession = app.get<BetterAuthService, { api: { getSession: jest.Mock } }>(BetterAuthService)
      .api.getSession;
    ({ restaurantId } = await seedBaseFixtures(em));

    const fork = em.fork();
    const user = fork.create(User, {
      id: UNVERIFIED_USER_ID,
      name: 'Unverified User',
      email: UNVERIFIED_USER_EMAIL,
      emailVerified: false,
    } as any);
    fork.create(AppUser, { authUser: user } as any);
    await fork.flush();
  });

  afterEach(async () => {
    const fork = em.fork();
    // Supprime aussi ses points en attente
    await fork.nativeDelete(Order, { restaurant: restaurantId });
    await fork.nativeDelete(PointsTransaction, { customer: { restaurant: restaurantId } });
    await fork.nativeDelete(Customer, { restaurant: restaurantId });
    getSession.mockResolvedValue({ user: { id: TEST_USER_ID }, session: {} });
  });

  afterAll(async () => {
    const fork = em.fork();
    await fork.nativeDelete(AppUser, { authUser: UNVERIFIED_USER_ID });
    await fork.nativeDelete(User, { id: UNVERIFIED_USER_ID });
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
    if (previousSecret === undefined) delete process.env.ORDER_TOKEN_SECRET;
    else process.env.ORDER_TOKEN_SECRET = previousSecret;
  });

  const createOrder = async (data: Partial<Order> = {}): Promise<Order> => {
    const fork = em.fork();
    const order = fork.create(Order, {
      hubriseOrderId: `it-claim-${randomUUID()}`,
      restaurant: restaurantId,
      status: 'completed',
      total: 5060,
      currency: 'EUR',
      points: 50,
      ref: '42',
      orderedAt: new Date(),
      ...data,
    } as any);
    await fork.flush();
    return order;
  };
  /** Comme la tablette du restaurant : la commande signée avec le secret des tokens de commande */
  const tokenFor = (order: Order, secret = ORDER_TOKEN_SECRET) =>
    new JwtService({ secret, signOptions: { expiresIn: '10m' } }).signAsync({ orderId: order.id });
  const claim = (token: string) =>
    request(app.getHttpServer()).post('/users/me/orders/claim').send({ token });
  const claimByEmail = (token: string, email: string) =>
    request(app.getHttpServer()).post('/orders/claim').send({ token, email });
  const findOrder = (order: Order) => em.fork().findOneOrFail(Order, order.id);
  const findCustomer = (userId = TEST_USER_ID) =>
    em.fork().findOne(Customer, { user: userId, restaurant: restaurantId });

  // ── POST /users/me/orders/claim ─────────────────────────────────────────────

  describe('POST /users/me/orders/claim', () => {
    it('credits the points to the connected user, only once per order', async () => {
      const order = await createOrder();
      const token = await tokenFor(order);

      await claim(token).expect(201, { points: 50 });

      const customer = await findCustomer();
      expect(customer).toMatchObject({ points: 50, totalPointsGained: 50 });
      expect(customer!.isInactive).toBe(false);
      expect(await em.fork().find(PointsTransaction, { customer: customer! })).toMatchObject([
        { type: PointsTransactionType.GAIN, amount: 50, reason: 'Commande 42' },
      ]);
      const claimed = await findOrder(order);
      expect(claimed.user?.id).toBe(TEST_USER_ID);
      expect(claimed.claimedAt).toBeInstanceOf(Date);

      await claim(token).expect(409);
      expect((await findCustomer())!.points).toBe(50);
    });

    it('adds the points to the existing card of the restaurant', async () => {
      const fork = em.fork();
      fork.create(Customer, { user: TEST_USER_ID, restaurant: restaurantId, points: 10 } as any);
      await fork.flush();
      const order = await createOrder({ ref: undefined, hubriseOrderId: 'it-claim-no-ref' });

      await claim(await tokenFor(order)).expect(201, { points: 50 });

      expect((await findCustomer())!.points).toBe(60);
      const [transaction] = await em.fork().find(PointsTransaction, {
        customer: { user: TEST_USER_ID, restaurant: restaurantId },
      });
      expect(transaction.reason).toBe('Commande it-claim-no-ref');
    });

    it('credits only once when the same token is used twice at the same time', async () => {
      const token = await tokenFor(await createOrder());

      const results = await Promise.all([claim(token), claim(token)]);

      expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
      expect((await findCustomer())!.points).toBe(50);
    });

    it.each([
      ['cancelled', { status: 'cancelled' }],
      ['rejected', { status: 'rejected' }],
      ['without points', { points: 0, total: 99 }],
    ])('answers 409 for an order %s', async (_, data) => {
      await claim(await tokenFor(await createOrder(data))).expect(409);

      expect(await findCustomer()).toBeNull();
    });

    it('answers 400 for a token not signed with the order secret', async () => {
      const order = await createOrder();

      await claim(await tokenFor(order, 'another-secret')).expect(400);
      await claim('not-a-jwt').expect(400);
      expect((await findOrder(order)).claimedAt).toBeNull();
    });

    it('answers 401 without a session', async () => {
      getSession.mockResolvedValue(null);
      const order = await createOrder();

      await claim(await tokenFor(order)).expect(401);
      expect((await findOrder(order)).claimedAt).toBeNull();
    });
  });

  // ── POST /orders/claim ──────────────────────────────────────────────────────

  describe('POST /orders/claim', () => {
    beforeEach(() => {
      // La tablette du restaurant n'a pas de session client
      getSession.mockResolvedValue(null);
    });

    const findPending = () =>
      em
        .fork()
        .find(PendingPoints, { order: { restaurant: restaurantId } }, { populate: ['order'] });

    it('keeps the points pending for an email without account, only once per order', async () => {
      const order = await createOrder();
      const token = await tokenFor(order);

      await claimByEmail(token, ' Nobody@Test.com ').expect(201, { points: 50 });

      const pending = await findPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].email).toBe('nobody@test.com');
      expect(pending[0].order.id).toBe(order.id);
      const claimed = await findOrder(order);
      expect(claimed.claimedAt).toBeInstanceOf(Date);
      expect(claimed.user).toBeNull();

      await claimByEmail(token, 'someone-else@test.com').expect(409);
      // Déjà en attente : la session ne permet pas de la récupérer non plus
      getSession.mockResolvedValue({ user: { id: TEST_USER_ID }, session: {} });
      await claim(token).expect(409);
      expect(await findPending()).toHaveLength(1);
      expect(await findCustomer()).toBeNull();
    });

    it('credits directly the verified account of the email, with the same answer', async () => {
      const order = await createOrder();

      await claimByEmail(await tokenFor(order), TEST_USER_EMAIL.toUpperCase()).expect(201, {
        points: 50,
      });

      expect((await findCustomer())!.points).toBe(50);
      expect((await findOrder(order)).user?.id).toBe(TEST_USER_ID);
      expect(await findPending()).toHaveLength(0);
    });

    it('keeps the points pending for an account whose email is not verified', async () => {
      await claimByEmail(await tokenFor(await createOrder()), UNVERIFIED_USER_EMAIL).expect(201, {
        points: 50,
      });

      expect(await findCustomer(UNVERIFIED_USER_ID)).toBeNull();
      expect(await findPending()).toMatchObject([{ email: UNVERIFIED_USER_EMAIL }]);
    });

    it('answers 400 for an invalid email or token', async () => {
      const order = await createOrder();

      await claimByEmail(await tokenFor(order), 'not-an-email').expect(400);
      await claimByEmail(await tokenFor(order, 'another-secret'), TEST_USER_EMAIL).expect(400);
      expect((await findOrder(order)).claimedAt).toBeNull();
    });

    it('answers 409 for a cancelled order', async () => {
      await claimByEmail(
        await tokenFor(await createOrder({ status: 'cancelled' })),
        TEST_USER_EMAIL,
      ).expect(409);

      expect(await findPending()).toHaveLength(0);
    });
  });
});
