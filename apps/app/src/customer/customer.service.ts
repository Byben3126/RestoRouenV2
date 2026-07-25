import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@mikro-orm/nestjs';

import { AddCustomerPointsDto } from './dto/add-customer-points.dto';
import { GetCustomersQueryDto } from './dto/get-customers-query.dto';
import { Customer } from './entities/customer.entity';
import { PointsTransaction } from './entities/points-transaction.entity';
import { PaginatedCustomers } from './repositories/customer.repository';
import { CustomerRepository } from './repositories/customer.repository';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: CustomerRepository,
  ) {}

  getRestaurantCustomers(
    restaurantId: string,
    query: GetCustomersQueryDto,
  ): Promise<PaginatedCustomers> {
    return this.customerRepository.findPaginated(restaurantId, query);
  }

  async addPoints(
    restaurantId: string,
    customerId: string,
    dto: AddCustomerPointsDto,
  ): Promise<Customer> {
    const customer = await this.customerRepository.addPointsForRestaurant(
      restaurantId,
      customerId,
      dto,
    );
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async getPointsTransactions(
    restaurantId: string,
    customerId: string,
  ): Promise<PointsTransaction[]> {
    const transactions = await this.customerRepository.findPointsTransactions(
      restaurantId,
      customerId,
    );
    if (!transactions) throw new NotFoundException('Customer not found');
    return transactions;
  }
}
