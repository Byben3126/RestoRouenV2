import { EventEmitter2 } from '@nestjs/event-emitter';

import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { CreateOptions, RequiredEntityData } from '@mikro-orm/postgresql';

import { Person } from '../entities/person.entity';
import { PersonCreatedEvent } from '../events/person-created.event';

export class PersonRepository extends EntityRepository<Person> {
  constructor(
    em: EntityManager,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super(em, Person);
  }

  create<Convert extends boolean = false>(
    data: RequiredEntityData<Person, never, Convert>,
    options?: CreateOptions<Convert>,
  ): Person {
    const person = super.create(data, options);
    this.eventEmitter.emit('person.created', new PersonCreatedEvent(person.userId));
    return person;
  }

  async findByUserId(userId: string): Promise<Person | null> {
    return this.findOne({ userId });
  }
}
