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

  /**
   * Attendu par l'inscription (emitAsync) : l'AppUser et la Person existent dès la réponse.
   * suppressErrors: false pour que l'inscription voie l'échec et annule la création du compte.
   */
  @OnEvent(AUTH_USER_CREATED_EVENT, { suppressErrors: false })
  async handleAuthUserCreated(payload: AuthUserCreatedEvent) {
    await RequestContext.create(this.orm.em, () =>
      this.userService.createFromAuthUser({
        userId: payload.id,
        email: payload.email,
        firstName: payload.firstName ?? payload.name,
        lastName: payload.lastName,
      }),
    );
  }
}
