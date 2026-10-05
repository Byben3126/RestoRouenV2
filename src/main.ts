import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { MikroORM, RequestContext } from '@mikro-orm/core';

import { setupAdmin } from './admin/admin.setup';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  // Le parsing du body est délégué au module better-auth : il laisse /auth intact
  // et conserve le body brut (req.rawBody) pour le webhook Stripe.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Un EntityManager forké par requête, y compris pour better-auth et l'admin
  const orm = app.get(MikroORM);
  app.use((req: unknown, res: unknown, next: () => void) => {
    RequestContext.create(orm.em, next);
  });

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Monté avant les body parsers : AdminJS lit lui-même ses formulaires
  setupAdmin(app);
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
