import { Module } from '@nestjs/common';

import { DatabaseModule } from '@app/database';

import { MediaModule } from './media/media.module';

@Module({
  imports: [DatabaseModule, MediaModule],
})
export class AppModule {}
