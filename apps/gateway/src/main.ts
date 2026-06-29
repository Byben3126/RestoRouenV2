import 'dotenv/config';

import { NestFactory } from '@nestjs/core';

import { MikroORM } from '@mikro-orm/core';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { AppModule } from './app.module';
import { createAuthMiddleware } from './common/middlewares/auth.middleware';
import { mediaMiddleware } from './common/middlewares/media.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const orm = app.get(MikroORM);
  const authMiddleware = createAuthMiddleware(orm);

  const authHost = process.env.AUTH_HOST ?? 'localhost';
  const appHost = process.env.APP_HOST ?? 'localhost';
  const mediaHost = process.env.MEDIA_HOST ?? 'localhost';

  app.use(
    '/auth/',
    createProxyMiddleware({
      target: `http://${authHost}:${process.env.PORT_AUTH}`,
      changeOrigin: true,
      xfwd: true,
    }),
  );

  app.use(
    '/media',
    authMiddleware,
    mediaMiddleware,
    createProxyMiddleware({
      target: `http://${mediaHost}:${process.env.PORT_MEDIA}`,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: { '^': '/media' },
    }),
  );

  app.use(
    '/',
    authMiddleware,
    createProxyMiddleware({
      target: `http://${appHost}:${process.env.PORT_APP}`,
      changeOrigin: true,
      xfwd: true,
    }),
  );

  await app.listen(process.env.PORT_GATEWAY ?? 3000);
}
bootstrap().catch(console.error);
