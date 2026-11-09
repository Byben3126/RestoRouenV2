/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { INestApplication } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/postgresql';
import { randomUUID } from 'crypto';
import request from 'supertest';

import { Customer } from '../src/customer/entities/customer.entity';
import { PointsTransaction } from '../src/customer/entities/points-transaction.entity';
import { Rating } from '../src/rating/entities/rating.entity';
import { Restaurant } from '../src/restaurant/entities/restaurant.entity';
import { AppUser } from '../src/user/entities/app-user.entity';
import {
  TEST_USER_ID,
  cleanBaseFixtures,
  createTestApp,
  seedBaseFixtures,
} from './helpers/app.helper';

describe('UserRatingController (integration)', () => {
  let app: INestApplication;
  let em: EntityManager;
  let restaurantId: string;
  let customerId: string;

  beforeAll(async () => {
    const ctx = await createTestApp();
    app = ctx.app;
    em = ctx.em;
    ({ restaurantId } = await seedBaseFixtures(em));

    const fork = em.fork();
    const restaurant = await fork.findOneOrFail(Restaurant, restaurantId);
    restaurant.averageRating = 4;
    restaurant.reviewCount = 1;
    const customer = fork.create(Customer, {
      user: fork.getReference(AppUser, TEST_USER_ID),
      restaurant,
      canSubmitRating: true,
    } as any);
    await fork.flush();
    customerId = customer.id;
  });

  afterAll(async () => {
    const fork = em.fork();
    await fork.nativeDelete(Rating, { customer: customerId });
    await fork.nativeDelete(PointsTransaction, { customer: customerId });
    await fork.nativeDelete(Customer, { id: customerId });
    await cleanBaseFixtures(em, restaurantId);
    await app.close();
  });

  const rate = (restaurant: string, body: object) =>
    request(app.getHttpServer()).post(`/users/me/restaurants/${restaurant}/ratings`).send(body);

  const findRestaurant = () => em.fork().findOneOrFail(Restaurant, restaurantId);

  it('rates the last visit and updates the restaurant average', async () => {
    const res = await rate(restaurantId, { globalRating: 2 }).expect(201);

    expect(res.body).toEqual({
      id: expect.any(String),
      globalRating: 2,
      createdAt: expect.any(String),
    });
    expect(await findRestaurant()).toMatchObject({ averageRating: 3, reviewCount: 2 });
  });

  it('allows a single rating per visit', async () => {
    await rate(restaurantId, { globalRating: 5 }).expect(403);

    const loyalty = await request(app.getHttpServer()).get(`/restaurant/${restaurantId}`);
    expect(loyalty.body.loyalty.canSubmitRating).toBe(false);
  });

  it('allows a new rating after the next visit', async () => {
    const fork = em.fork();
    const customer = await fork.findOneOrFail(Customer, customerId);
    customer.addPoints(10);
    await fork.flush();

    const loyalty = await request(app.getHttpServer()).get(`/restaurant/${restaurantId}`);
    expect(loyalty.body.loyalty.canSubmitRating).toBe(true);

    await rate(restaurantId, { globalRating: 5 }).expect(201);
    const restaurant = await findRestaurant();
    expect(restaurant.reviewCount).toBe(3);
    expect(restaurant.averageRating).toBeCloseTo(11 / 3);
  });

  it('rejects a user without a card in the restaurant', async () => {
    await rate(randomUUID(), { globalRating: 4 }).expect(403);
  });

  it.each([0, 6, 3.5, undefined])('rejects a rating of %s', async (globalRating) => {
    await rate(restaurantId, { globalRating }).expect(400);
  });
});
