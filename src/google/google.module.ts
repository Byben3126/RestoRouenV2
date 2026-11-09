import { Module } from '@nestjs/common';

import { GooglePlacesService } from './google-places.service';
import { GoogleController } from './google.controller';
import { GoogleService } from './google.service';

@Module({
  controllers: [GoogleController],
  providers: [GooglePlacesService, GoogleService],
  exports: [GooglePlacesService],
})
export class GoogleModule {}
