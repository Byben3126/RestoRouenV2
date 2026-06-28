import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Media } from './entities/media.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { S3Service } from './s3.service';

@Module({
  imports: [MikroOrmModule.forFeature([Media])],
  controllers: [MediaController],
  providers: [MediaService, S3Service],
})
export class MediaModule {}
