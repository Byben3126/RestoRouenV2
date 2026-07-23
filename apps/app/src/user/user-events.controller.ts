import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { MikroORM, RequestContext } from '@mikro-orm/core';

import { UserService } from './user.service';

interface UserCreatedPayload {
  id: string;
  name: string;
  email: string;
}

@Controller()
export class UserEventsController {
  constructor(
    private readonly orm: MikroORM,
    private readonly userService: UserService,
  ) {}

  @MessagePattern('user.created')
  async handleUserCreated(@Payload() payload: UserCreatedPayload) {
    await new Promise<void>((resolve, reject) => {
      RequestContext.create(this.orm.em, () => {
        this.userService
          .createFromAuthUser({ userId: payload.id, name: payload.name, email: payload.email })
          .then(resolve)
          .catch(reject);
      });
    });
  }
}
