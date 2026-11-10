import { EventEmitter2 } from '@nestjs/event-emitter';

import { EntityManager, EntityRepository } from '@mikro-orm/postgresql';
import { CreateOptions, RequiredEntityData } from '@mikro-orm/postgresql';

import { Worker } from '../entities/worker.entity';
import { WorkerCreatedEvent } from '../events/worker-created.event';

export class WorkerRepository extends EntityRepository<Worker> {
  constructor(
    em: EntityManager,
    private readonly eventEmitter: EventEmitter2, // ← Reçoit l'instance
  ) {
    super(em, Worker);
  }

  create<Convert extends boolean = false>(
    data: RequiredEntityData<Worker, never, Convert>,
    options?: CreateOptions<Convert>,
  ): Worker {
    const worker = super.create(data, options);

    this.eventEmitter.emit('worker.created', new WorkerCreatedEvent(worker.email));
    return worker;
  }

  async findByEmail(email: string) {
    return this.findOne({ email });
  }

  async findActiveUsers() {
    return this.find({ isActive: true });
  }
}
