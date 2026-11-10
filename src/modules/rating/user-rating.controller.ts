import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Serialize } from '../../common/decorators/serialize.decorator';
import { CreateRatingDto, RatingDto } from './dto';
import { RatingService } from './rating.service';

/** Notes données par l'utilisateur connecté à un restaurant */
@ApiTags('Restaurant')
@Controller('users/me/restaurants/:restaurantId/ratings')
export class UserRatingController {
  constructor(private readonly ratingService: RatingService) {}

  /** Note la dernière visite : une note par visite, possible quand loyalty.canSubmitRating est true */
  @Post()
  @Serialize(RatingDto)
  @ApiCreatedResponse({ type: RatingDto })
  rateRestaurant(
    @CurrentUser() userId: string,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
    @Body() dto: CreateRatingDto,
  ) {
    return this.ratingService.rateRestaurant(userId, restaurantId, dto);
  }
}
