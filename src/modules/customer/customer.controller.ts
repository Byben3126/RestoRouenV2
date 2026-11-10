import { Body, Controller, Get, HttpCode, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentRestaurant } from '../../common/decorators/current-restaurant.decorator';
import { Serialize } from '../../common/decorators/serialize.decorator';
import { RestaurantOwnerGuard } from '../../common/guards/restaurant-owner.guard';
import { CustomerService } from './customer.service';
import {
  AddCustomerPointsDto,
  CustomerDto,
  GetCustomersQueryDto,
  PaginatedCustomersDto,
  PointsTransactionDto,
  ScanCustomerDto,
} from './dto';

@ApiTags('Customers')
@UseGuards(RestaurantOwnerGuard)
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

  /** Scan de la carte client (QR code ou code saisi) : renvoie le client, créé au premier passage */
  @Post('scan')
  @HttpCode(200)
  @Serialize(CustomerDto, ['owner'])
  @ApiOkResponse({ type: CustomerDto })
  scanCustomer(@CurrentRestaurant() restaurantId: string, @Body() dto: ScanCustomerDto) {
    return this.customerService.scanCustomer(restaurantId, dto.linkCode);
  }

  @Post(':id/points')
  @Serialize(CustomerDto, ['owner'])
  @ApiCreatedResponse({ type: CustomerDto })
  addPoints(
    @CurrentRestaurant() restaurantId: string,
    @Param('id') customerId: string,
    @Body() dto: AddCustomerPointsDto,
  ) {
    return this.customerService.addPoints(restaurantId, customerId, dto);
  }

  @Get(':id/points-transactions')
  @Serialize(PointsTransactionDto, ['owner'])
  @ApiOkResponse({ type: PointsTransactionDto, isArray: true })
  getPointsTransactions(
    @CurrentRestaurant() restaurantId: string,
    @Param('id') customerId: string,
  ) {
    return this.customerService.getPointsTransactions(restaurantId, customerId);
  }
}
