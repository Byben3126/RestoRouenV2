import { Injectable } from '@nestjs/common';

import { MikroORM } from '@mikro-orm/core';

import { auth } from './auth';

@Injectable()
export class AuthService {
  public readonly auth;

  constructor(private readonly orm: MikroORM) {
    this.auth = auth(orm);
  }

  getHello(): string {
    return 'Hello World!';
  }
}
