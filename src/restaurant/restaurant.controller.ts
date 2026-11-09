import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import {
  CreateRestaurantDto,
  NearbyRestaurantsQueryDto,
  PaginatedNearbyRestaurantsDto,
  PaginatedRestaurantsDto,
  RestaurantDto,
  SearchRestaurantsQueryDto,
  UpdateRestaurantDto,
  UserRestaurantDto,
} from './dto';
import { RestaurantService } from './restaurant.service';

@ApiTags('Restaurant')
@Controller('restaurant')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Post()
  @Serialize(RestaurantDto, ['owner'])
  @ApiCreatedResponse({ type: RestaurantDto })
  createMyRestaurant(@CurrentUser() userId: string, @Body() dto: CreateRestaurantDto) {
    return this.restaurantService.createMyRestaurant(userId, dto);
  }

  @Get('me')
  @Serialize(RestaurantDto, ['owner'])
  @ApiOkResponse({ type: RestaurantDto })
  getMyRestaurant(@CurrentUser() userId: string) {
    return this.restaurantService.getMyRestaurant(userId);
  }

  @Patch('me')
  @Serialize(RestaurantDto, ['owner'])
  @ApiOkResponse({ type: RestaurantDto })
  updateMyRestaurant(@CurrentUser() userId: string, @Body() dto: UpdateRestaurantDto) {
    return this.restaurantService.updateMyRestaurant(userId, dto);
  }

  // search et nearby sont déclarées avant :restaurantId, sinon elles seraient lues comme un id
  @Get('nearby')
  @Serialize(PaginatedNearbyRestaurantsDto)
  @ApiOkResponse({ type: PaginatedNearbyRestaurantsDto })
  findNearbyRestaurants(@CurrentUser() userId: string, @Query() query: NearbyRestaurantsQueryDto) {
    return this.restaurantService.findNearbyRestaurants(userId, query);
  }

  @Get('search')
  @Serialize(PaginatedRestaurantsDto)
  @ApiOkResponse({ type: PaginatedRestaurantsDto })
  searchRestaurants(@CurrentUser() userId: string, @Query() query: SearchRestaurantsQueryDto) {
    return this.restaurantService.searchRestaurants(userId, query);
  }

  @Get(':restaurantId')
  @Serialize(UserRestaurantDto)
  @ApiOkResponse({ type: UserRestaurantDto })
  getRestaurant(
    @CurrentUser() userId: string,
    @Param('restaurantId', ParseUUIDPipe) restaurantId: string,
  ) {
    return this.restaurantService.getRestaurant(userId, restaurantId);
  }
}
