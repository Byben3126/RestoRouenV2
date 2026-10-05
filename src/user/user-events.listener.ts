import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { MikroORM, RequestContext } from '@mikro-orm/core';

import {
  AUTH_USER_CREATED_EVENT,
  AuthUserCreatedEvent,
} from '../auth/events/auth-user-created.event';
import { UserService } from './user.service';

@Injectable()
export class UserEventsListener {
  constructor(
    private readonly orm: MikroORM,
    private readonly userService: UserService,
  ) {}

  @OnEvent(AUTH_USER_CREATED_EVENT, { async: true })
  async handleAuthUserCreated(payload: AuthUserCreatedEvent) {
    await RequestContext.create(this.orm.em, () =>
      this.userService.createFromAuthUser({
        userId: payload.id,
        name: payload.name,
        email: payload.email,
      }),
    );
  }
}
