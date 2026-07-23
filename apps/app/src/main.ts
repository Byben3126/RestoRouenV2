import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';

import { setupAdmin } from './admin/admin.setup';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    rawBody: true, // <-- AJOUTÉ : indispensable pour que Stripe puisse lire le body brut
  });
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  setupAdmin(app);
  app.useBodyParser('json'); // <-- CORRIGÉ : plus de "true" en 2e argument
  app.useBodyParser('urlencoded', { extended: true }); // <-- CORRIGÉ : plus de "false" en 2e argument
  setupSwagger(app);

  // 👇 volet microservice : écoute les events TCP
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: parseInt(process.env.PORT_APP_TCP ?? '3102') },
  });
  await app.startAllMicroservices();

  await app.listen(process.env.PORT_APP ?? 3002);
}
void bootstrap();
