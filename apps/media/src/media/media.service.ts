import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';

import { randomUUID } from 'crypto';

import { ConfirmResponseDto } from './dto/confirm-response.dto';
import { RequestUploadDto } from './dto/request-upload.dto';
import { UploadResponseDto } from './dto/upload-response.dto';
import { RequiredEntityData } from '@mikro-orm/core';

import { Media, MediaStatus } from './entities/media.entity';
import { MediaRepository } from './repositories/media.repository';
import { S3Service } from './s3.service';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: MediaRepository,
    private readonly s3Service: S3Service,
  ) {}

  async requestUpload(ownerId: string, dto: RequestUploadDto): Promise<UploadResponseDto> {
    const ext = dto.mimeType.split('/')[1] ?? 'bin';
    const key = `${ownerId}/${randomUUID()}.${ext}`;

    const media = this.mediaRepository.create({
      key,
      ownerId,
      mimeType: dto.mimeType,
      size: dto.size,
    } as RequiredEntityData<Media>);

    await this.mediaRepository.getEntityManager().flush();

    const uploadUrl = await this.s3Service.getPresignedUploadUrl(key, dto.mimeType);

    return { mediaId: media.id, uploadUrl };
  }

  async confirm(ownerId: string, mediaId: string): Promise<ConfirmResponseDto> {
    const media = await this.mediaRepository.findOne({ id: mediaId, ownerId, status: MediaStatus.PENDING });

    if (!media) throw new NotFoundException('Media not found');

    media.status = MediaStatus.CONFIRMED;
    await this.mediaRepository.getEntityManager().flush();

    return { url: this.s3Service.getCloudfrontUrl(media.key) };
  }
}
