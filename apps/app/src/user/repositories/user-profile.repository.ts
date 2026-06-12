import { EventEmitter2 } from '@nestjs/event-emitter';

import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { CreateOptions, RequiredEntityData } from '@mikro-orm/postgresql';

import { UserProfile } from '../entities';
import { UserProfileCreatedEvent } from '../events/user-profile-created.event';

export class UserProfileRepository extends EntityRepository<UserProfile> {
  constructor(
    em: EntityManager,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(em, UserProfile);
  }

  create<Convert extends boolean = false>(
    data: RequiredEntityData<UserProfile, never, Convert>,
    options?: CreateOptions<Convert>,
  ): UserProfile {
    const profile = super.create(data, options);
    this.eventEmitter.emit('user-profile.created', new UserProfileCreatedEvent(profile.userId));
    return profile;
  }

  async findByUserId(userId: string): Promise<UserProfile | null> {
    return this.findOne({ userId });
  }

  async findByLinkCode(linkCode: string): Promise<UserProfile | null> {
    return this.findOne({ linkCode });
  }
}
