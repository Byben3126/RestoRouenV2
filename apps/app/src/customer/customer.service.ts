import { Injectable } from '@nestjs/common';

import { InjectRepository } from '@mikro-orm/nestjs';

import { GetCustomersQueryDto } from './dto/get-customers-query.dto';
import { Customer } from './entities/customer.entity';
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
}
