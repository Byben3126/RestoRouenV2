import { Module } from '@nestjs/common';

import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Rating } from './entities';
import { RatingService } from './rating.service';
import { UserRatingController } from './user-rating.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Rating])],
  controllers: [UserRatingController],
  providers: [RatingService],
})
export class RatingModule {}
