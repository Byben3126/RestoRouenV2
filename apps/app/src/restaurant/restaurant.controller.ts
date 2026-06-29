import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Serialize } from '@main/common/decorators/serialize.decorator';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateRestaurantDto, RestaurantDto, UpdateRestaurantDto } from './dto';
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
}
