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

  app.use((req: unknown, res: unknown, next: () => void) => {
    RequestContext.create(orm.em, next);
  });

  await app.listen(process.env.PORT_AUTH ?? 3001);
}
bootstrap().catch(console.error);
