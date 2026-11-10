import { Entity, EntityRepositoryType, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'crypto';

import { MediaRepository } from '../repositories/media.repository';

export enum MediaStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
}

@Entity({ repository: () => MediaRepository })
export class Media {
  [EntityRepositoryType]?: MediaRepository;

  @PrimaryKey({ type: 'uuid' })
  id: string = randomUUID();

  @Property()
  key!: string;

  @Property()
  ownerId!: string;

  @Property({ nullable: true })
  mimeType?: string;

  @Property({ nullable: true, type: 'bigint' })
  size?: number;

  @Enum(() => MediaStatus)
  status: MediaStatus = MediaStatus.PENDING;

  @Property({ onCreate: () => new Date() })
  createdAt: Date = new Date();
}
