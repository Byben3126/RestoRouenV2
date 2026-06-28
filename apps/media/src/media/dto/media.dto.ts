import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { MediaStatus } from '../entities/media.entity';

@Exclude()
export class MediaDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose() id!: string;

  @ApiProperty({ example: 'owner-id/uuid.webp' })
  @Expose() key!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose() ownerId!: string;

  @ApiProperty({ example: 'image/webp', required: false })
  @Expose() mimeType?: string;

  @ApiProperty({ example: 2097152, required: false })
  @Expose() size?: number;

  @ApiProperty({ enum: MediaStatus, example: MediaStatus.CONFIRMED })
  @Expose() status!: MediaStatus;

  @ApiProperty()
  @Expose() createdAt!: Date;
}
