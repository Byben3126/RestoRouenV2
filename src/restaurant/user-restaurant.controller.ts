import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ApiOkWrappedResponse } from '../common/decorators/api-response.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { GetUserRestaurantsQueryDto, PaginatedRestaurantsDto } from './dto';
import { RestaurantService } from './restaurant.service';

/** Restaurants où l'utilisateur connecté a une carte de fidélité */
@ApiTags('Restaurant')
@UseGuards(AuthGuard)
@Controller('users/me/restaurants')
export class UserRestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  /** sortBy=points pour le top des restaurants, lastVisit (par défaut) pour les derniers visités */
  @Get()
  @Serialize(PaginatedRestaurantsDto)
  @ApiOkWrappedResponse({ type: PaginatedRestaurantsDto })
  getUserRestaurants(@CurrentUser() userId: string, @Query() query: GetUserRestaurantsQueryDto) {
    return this.restaurantService.getUserRestaurants(userId, query);
  }
}
