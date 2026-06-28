import 'dotenv/config';

import { ValidationPipe } from '@nestjs/common';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Reflector } from '@nestjs/core';

import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { setupSwagger } from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.useGlobalInterceptors(new TransformInterceptor());
  // app.useGlobalInterceptors(
  //   new ClassSerializerInterceptor(app.get(Reflector), {
  //     strategy: 'excludeAll',
  //   }),
  // );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        //enableImplicitConversion: true //convertie les 'false' en true donc retiré,
      },
    }),
  );

  setupSwagger(app);
  await app.listen(process.env.PORT_APP ?? 3002);
}
void bootstrap();
