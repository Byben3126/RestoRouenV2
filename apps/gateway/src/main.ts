import 'dotenv/config';

import { NestFactory } from '@nestjs/core';

import { createProxyMiddleware } from 'http-proxy-middleware';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL, //frontend Next.js
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(
    '/api/auth/', // Le chemin sur ta Gateway
    createProxyMiddleware({
      target: `http://localhost:${process.env.PORT_AUTH}`, // L'URL de ton microservice Auth
      changeOrigin: true,
      xfwd: true,
    }),
  );
  await app.listen(process.env.PORT_GATEWAY ?? 3000);
}
bootstrap().catch(console.error);
