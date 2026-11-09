import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { GetUserRestaurantsQueryDto, PaginatedRestaurantsDto } from './dto';
import { RestaurantService } from './restaurant.service';

/** Restaurants où l'utilisateur connecté a une carte de fidélité */
@ApiTags('Restaurant')
@Controller('users/me/restaurants')
export class UserRestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  /** sortBy=points pour le top des restaurants, lastVisit (par défaut) pour les derniers visités */
  @Get()
  @Serialize(PaginatedRestaurantsDto)
  @ApiOkResponse({ type: PaginatedRestaurantsDto })
  getUserRestaurants(@CurrentUser() userId: string, @Query() query: GetUserRestaurantsQueryDto) {
    return this.restaurantService.getUserRestaurants(userId, query);
  }
}
