import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Serialize } from '../common/decorators/serialize.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { CreateRestaurantDto, RestaurantDto, UpdateRestaurantDto } from './dto';
import { RestaurantService } from './restaurant.service';

@ApiTags('Restaurant')
@UseGuards(AuthGuard)
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

  @Get(':restaurantId')
  @Serialize(RestaurantDto)
  @ApiOkResponse({ type: RestaurantDto })
  getRestaurant(@Param('restaurantId', ParseUUIDPipe) restaurantId: string) {
    return this.restaurantService.getRestaurant(restaurantId);
  }
}
