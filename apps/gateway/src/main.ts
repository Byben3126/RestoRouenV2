import 'dotenv/config';

import { NestFactory } from '@nestjs/core';

import { MikroORM } from '@mikro-orm/core';
import { raw } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { AppModule } from './app.module';
import { adminMiddleware } from './common/middlewares/admin.middleware';
import { createAuthMiddleware } from './common/middlewares/auth.middleware';
import { mediaMiddleware } from './common/middlewares/media.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

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
    '/admin',
    authMiddleware,
    adminMiddleware,
    createProxyMiddleware({
      target: `http://${appHost}:${process.env.PORT_APP}`,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: { '^': '/admin' },
    }),
  );
  app.use(
    '/webhook',
    // raw({ type: '*/*' }), // consomme le stream avant le proxy -> le body n'est jamais forwardé, la requête reste bloquée jusqu'au timeout
    // (req, res, next) => {
    //   console.log('--- DEBUG WEBHOOK (gateway) ---');
    //   console.log('Content-Type:', req.headers['content-type']);
    //   console.log('stripe-signature:', req.headers['stripe-signature']);
    //   console.log('raw body (buffer):', req.body); // Buffer
    //   console.log('raw body (string):', req.body?.toString('utf8'));
    //   next();
    // },
    createProxyMiddleware({
      target: `http://${appHost}:${process.env.PORT_APP}`,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: { '^': '/webhook' },
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
