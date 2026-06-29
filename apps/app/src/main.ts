import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';

import { AppModule } from './app.module';
import { setupAdmin } from './admin/admin.setup';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  // bodyParser: false — AdminJS doit monter son router AVANT les body parsers
  // pour que express-formidable puisse lire le body du login form
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.useGlobalInterceptors(new TransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 1. AdminJS en premier — monte son router AVANT les body parsers
  await setupAdmin(app);

  // 2. Body parsers pour les routes NestJS (après AdminJS)
  app.use(json());
  app.use(urlencoded({ extended: true }));

  // 3. Raw body pour Stripe webhooks
  app.use('/webhook', json({ type: 'application/json' }));

  setupSwagger(app);
  await app.listen(process.env.PORT_APP ?? 3002);
}
void bootstrap();
