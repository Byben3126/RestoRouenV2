import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

import { MikroORM } from '@mikro-orm/core';

import { auth } from './auth';

@Injectable()
export class AuthService {
  public readonly auth: ReturnType<typeof auth>;

  constructor(
    private readonly orm: MikroORM,
    @Inject('AUTH_SERVICE') private readonly client: ClientProxy,
  ) {
    this.auth = auth(this.orm, this.client);
  }

  getHello(): string {
    return 'Hello World!';
  }
}
