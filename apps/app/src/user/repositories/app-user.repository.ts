import { EventEmitter2 } from '@nestjs/event-emitter';

import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { CreateOptions, RequiredEntityData } from '@mikro-orm/postgresql';

import { AppUser } from '../entities/app-user.entity';
import { UserCreatedEvent } from '../events/user-created.event';

export class AppUserRepository extends EntityRepository<AppUser> {
  constructor(
    em: EntityManager,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(em, AppUser);
  }

  create<Convert extends boolean = false>(
    data: RequiredEntityData<AppUser, never, Convert>,
    options?: CreateOptions<Convert>,
  ): AppUser {
    const user = super.create(data, options);
    this.eventEmitter.emit('user.created', new UserCreatedEvent(user.id, user.authUser?.email));
    return user;
  }

  async findByAuthUserId(authUserId: string): Promise<AppUser | null> {
    return this.findOne({ authUser: authUserId }, { populate: ['authUser', 'person'] });
  }

  async findByLinkCode(linkCode: string): Promise<AppUser | null> {
    return this.findOne({ linkCode }, { populate: ['authUser', 'person'] });
  }
}
