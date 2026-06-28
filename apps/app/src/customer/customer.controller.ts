import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { Serialize } from '@main/common/decorators/serialize.decorator';

import { CurrentRestaurant } from '../common/decorators/current-restaurant.decorator';
import { AuthGuard } from '../common/guards/auth.guard';
import { RestaurantOwnerGuard } from '../common/guards/restaurant-owner.guard';
import { CustomerService } from './customer.service';
import { GetCustomersQueryDto, PaginatedCustomersDto } from './dto';

@ApiTags('Customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @UseGuards(AuthGuard, RestaurantOwnerGuard)
  @Get()
  @Serialize(PaginatedCustomersDto, ['owner'])
  @ApiOkResponse({ type: PaginatedCustomersDto })
  getRestaurantCustomers(
    @CurrentRestaurant() restaurantId: string,
    @Query() query: GetCustomersQueryDto,
  ) {
    return this.customerService.getRestaurantCustomers(restaurantId, query);
  }
}
