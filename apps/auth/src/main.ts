import 'dotenv/config';

import { NestFactory } from '@nestjs/core';

import { MikroORM } from '@mikro-orm/core';
import { RequestContext } from '@mikro-orm/core';

import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule, {
    bodyParser: false,
  });

  const orm = app.get(MikroORM);

  app.use((req, res, next) => {
    RequestContext.create(orm.em, next); // ✅ fork par requête
  });

  await app.listen(process.env.PORT_AUTH ?? 3001);
}
bootstrap().catch(console.error);
