import { EntityRepository } from '@mikro-orm/postgresql';

import { Media, MediaStatus } from '../entities/media.entity';

export class MediaRepository extends EntityRepository<Media> {
  async findByOwner(ownerId: string): Promise<Media[]> {
    return this.find(
      { ownerId, status: MediaStatus.CONFIRMED },
      { orderBy: { createdAt: 'DESC' } },
    );
  }
}
