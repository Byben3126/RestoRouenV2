import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Serialize } from '@main/common/decorators/serialize.decorator';

import { CurrentRestaurant } from '../common/decorators/current-restaurant.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RestaurantOwnerGuard } from '../common/guards/restaurant-owner.guard';
import { CustomerService } from './customer.service';
import { AddCustomerPointsDto, CustomerDto, GetCustomersQueryDto, PaginatedCustomersDto } from './dto';

@ApiTags('Customers')
@UseGuards(AuthGuard, RestaurantOwnerGuard)
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get()
  @Serialize(PaginatedCustomersDto, ['owner'])
  @ApiOkResponse({ type: PaginatedCustomersDto })
  getRestaurantCustomers(
    @CurrentRestaurant() restaurantId: string,
    @Query() query: GetCustomersQueryDto,
  ) {
    return this.customerService.getRestaurantCustomers(restaurantId, query);
  }

  @Post(':id/points')
  @Serialize(CustomerDto, ['owner'])
  @ApiOkResponse({ type: CustomerDto })
  addPoints(
    @CurrentRestaurant() restaurantId: string,
    @Param('id') customerId: string,
    @Body() dto: AddCustomerPointsDto,
  ) {
    return this.customerService.addPoints(restaurantId, customerId, dto);
  }
}
