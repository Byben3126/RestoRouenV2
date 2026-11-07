import { ForbiddenException, Injectable } from '@nestjs/common';

import { InjectRepository } from '@mikro-orm/nestjs';

import { CreateRatingDto } from './dto/create-rating.dto';
import { Rating } from './entities/rating.entity';
import { RatingRepository } from './repositories/rating.repository';

@Injectable()
export class RatingService {
  constructor(
    @InjectRepository(Rating)
    private readonly ratingRepository: RatingRepository,
  ) {}

  async rateRestaurant(
    userId: string,
    restaurantId: string,
    dto: CreateRatingDto,
  ): Promise<Rating> {
    const rating = await this.ratingRepository.rateLastVisit(userId, restaurantId, dto);
    if (!rating) throw new ForbiddenException('No visit to rate');
    return rating;
  }
}
