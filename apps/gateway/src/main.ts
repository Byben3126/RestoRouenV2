import 'dotenv/config';

import { NestFactory } from '@nestjs/core';

import { createProxyMiddleware } from 'http-proxy-middleware';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(
    '/auth/',
    createProxyMiddleware({
      target: `http://localhost:${process.env.PORT_AUTH}`,
      changeOrigin: true,
      xfwd: true,
    }),
  );

  app.use(
    '/',
    createProxyMiddleware({
      target: `http://localhost:${process.env.PORT_APP}`,
      changeOrigin: true,
      xfwd: true,
    }),
  );

  await app.listen(process.env.PORT_GATEWAY ?? 3000);
}
bootstrap().catch(console.error);
