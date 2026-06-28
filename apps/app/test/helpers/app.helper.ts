import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';

import { AppModule } from '../../src/app.module';
import { AuthGuard } from '../../src/common/guards/auth.guard';
import { TransformInterceptor } from '../../src/common/interceptors/transform.interceptor';

export const TEST_USER_ID = 'test-user-integration';

/**
 * Démarre une instance NestJS avec :
 * - AuthGuard remplacé par un mock qui injecte TEST_USER_ID
 * - Stripe mocké (via jest.mock dans chaque suite)
 * - Base de données réelle (mydb)
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  orm: MikroORM;
  em: EntityManager;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(AuthGuard)
    .useValue({
      canActivate: (ctx: any) => {
        const req = ctx.switchToHttp().getRequest();
        req.userId = TEST_USER_ID;
        return true;
      },
    })
    .compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();

  const orm = moduleFixture.get(MikroORM);
  const em = moduleFixture.get(EntityManager);

  return { app, orm, em };
}
