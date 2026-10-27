import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { Cursor } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';

import { AddCustomerPointsDto } from './dto/add-customer-points.dto';
import { GetCustomersQueryDto } from './dto/get-customers-query.dto';
import { GetPointsTransactionsQueryDto } from './dto/get-points-transactions-query.dto';
import { Customer } from './entities/customer.entity';
import { PointsTransaction } from './entities/points-transaction.entity';
import {
  CUSTOMER_POINTS_ADDED_EVENT,
  CustomerPointsAddedEvent,
} from './events/customer-points-added.event';
import { PaginatedCustomers } from './repositories/customer.repository';
import { CustomerRepository } from './repositories/customer.repository';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: CustomerRepository,
    private readonly eventEmitter: EventEmitter2,
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

    this.eventEmitter.emit(
      CUSTOMER_POINTS_ADDED_EVENT,
      new CustomerPointsAddedEvent(
        customer.user.id,
        restaurantId,
        dto.amount,
        customer.points,
        dto.reason,
      ),
    );
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

  async getUserPointsTransactions(
    userId: string,
    restaurantId: string,
    { after, limit }: GetPointsTransactionsQueryDto,
  ) {
    if (after) {
      try {
        Cursor.decode(after);
      } catch {
        throw new BadRequestException('Invalid cursor');
      }
    }

    const page = await this.customerRepository.findPointsTransactionsPageForUser(
      userId,
      restaurantId,
      limit,
      after,
    );
    return { items: page.items, nextCursor: page.hasNextPage ? page.endCursor : null };
  }
}
