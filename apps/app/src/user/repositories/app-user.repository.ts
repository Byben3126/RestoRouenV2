import { EventEmitter2 } from '@nestjs/event-emitter';

import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { CreateOptions, RequiredEntityData } from '@mikro-orm/postgresql';

import { User } from '@app/auth/entities/user.entity';

import { AppUser } from '../entities/app-user.entity';
import { Person } from '../entities/person.entity';
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

  async createFromAuthUser(payload: { userId: string; name: string; email: string }): Promise<void> {
    const existing = await this.findOne({ authUser: payload.userId });
    if (existing) return;

    const authUser = this.em.getReference(User, payload.userId);
    const appUser = this.em.create(AppUser, { authUser } as any);

    const nameParts = (payload.name || payload.email.split('@')[0]).trim().split(/\s+/);
    const person = new Person();
    person.user = appUser;
    person.firstName = nameParts[0];
    person.lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;
    this.em.persist(person);

    await this.em.flush();
  }
}
