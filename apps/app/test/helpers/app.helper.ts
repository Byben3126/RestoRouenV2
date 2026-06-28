import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';

import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { User } from '@app/auth/entities/user.entity';

import { AppModule } from '../../src/app.module';
import { AuthGuard } from '../../src/common/guards/auth.guard';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';
import { Restaurant } from '../../src/restaurant/entities/restaurant.entity';
import { AppUser } from '../../src/user/entities/app-user.entity';

export const TEST_USER_ID = 'test-user-integration';

export interface AppTestContext {
  app: INestApplication;
  orm: MikroORM;
  em: EntityManager;
}

export async function createTestApp(options?: {
  extraOverrides?: (builder: TestingModuleBuilder) => TestingModuleBuilder;
}): Promise<AppTestContext> {
  let builder: TestingModuleBuilder = Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(AuthGuard)
    .useValue({
      canActivate: (ctx: any) => {
        const req = ctx.switchToHttp().getRequest();
        req.userId = TEST_USER_ID;
        return true;
      },
    });

  if (options?.extraOverrides) {
    builder = options.extraOverrides(builder);
  }

  const moduleFixture: TestingModule = await builder.compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.init();

  const orm = moduleFixture.get(MikroORM);
  const em = moduleFixture.get(EntityManager);

  return { app, orm, em };
}

export async function seedUserOnly(em: EntityManager): Promise<void> {
  const fork = em.fork();
  fork.create(User, {
    id: TEST_USER_ID,
    name: 'Integration Test User',
    email: 'integration@test.com',
    emailVerified: true,
  });
  fork.create(AppUser, { authUser: fork.getReference(User, TEST_USER_ID) });
  await fork.flush();
}

export async function seedBaseFixtures(em: EntityManager): Promise<{ restaurantId: string }> {
  await seedUserOnly(em);
  const fork = em.fork();
  const restaurant = fork.create(Restaurant, {
    user: fork.getReference(AppUser, TEST_USER_ID),
    name: 'Test Restaurant',
    latitude: 49.44,
    longitude: 1.09,
  });
  await fork.flush();
  return { restaurantId: restaurant.id };
}

export async function cleanBaseFixtures(em: EntityManager, restaurantId?: string): Promise<void> {
  const fork = em.fork();
  if (restaurantId) {
    await fork.nativeDelete(Restaurant, { id: restaurantId });
  } else {
    await fork.nativeDelete(Restaurant, { user: TEST_USER_ID });
  }
  await fork.nativeDelete(AppUser, { authUser: TEST_USER_ID });
  await fork.nativeDelete(User, { id: TEST_USER_ID });
}
