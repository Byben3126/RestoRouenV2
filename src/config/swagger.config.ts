import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule, getSchemaPath } from '@nestjs/swagger';

import { AuthService } from '@thallesp/nestjs-better-auth';

import { auth } from '../auth/auth';
import { SignUpDto } from '../auth/dto/sign-up.dto';
import { UserDto } from '../user/dto/user.dto';

type AppAuthService = AuthService<ReturnType<typeof auth>>;

/** Routes de Better Auth : servies par son propre middleware, Swagger ne les voit pas */
async function mergeBetterAuthSchema(app: INestApplication, document: OpenAPIObject) {
  const authDocument = await app.get<AppAuthService>(AuthService).api.generateOpenAPISchema();
  for (const [path, item] of Object.entries(authDocument.paths)) {
    for (const operation of [item.get, item.post]) if (operation) operation.tags = ['Auth'];
    document.paths[`/auth${path}`] = item as OpenAPIObject['paths'][string];
  }

  Object.assign(document.components!.schemas!, authDocument.components.schemas, {
    // Le user renvoyé est celui de GET /users/me (hook after de auth.ts)
    User: { $ref: getSchemaPath(UserDto) },
  });

  // L'inscription attend firstName et lastName (hook before de auth.ts)
  document.paths['/auth/sign-up/email'].post!.requestBody = {
    content: { 'application/json': { schema: { $ref: getSchemaPath(SignUpDto) } } },
  };
}

export async function setupSwagger(app: INestApplication): Promise<void> {
  const config = new DocumentBuilder()
    .setTitle('RestoRouen API')
    .setVersion('2.0')
    // Même nom que dans la description de Better Auth, dont les routes y font référence
    .addBearerAuth(undefined, 'bearerAuth')
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [UserDto, SignUpDto],
  });
  await mergeBetterAuthSchema(app, document);
  SwaggerModule.setup('docs', app, document);
}
