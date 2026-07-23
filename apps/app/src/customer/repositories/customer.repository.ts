import {
  EntityManager,
  EntityRepository,
  FilterQuery,
  RequiredEntityData,
} from '@mikro-orm/postgresql';

import { AddCustomerPointsDto } from '../dto/add-customer-points.dto';
import { CustomerSortBy, GetCustomersQueryDto } from '../dto/get-customers-query.dto';
import { Customer } from '../entities/customer.entity';
import { PointsTransaction } from '../entities/points-transaction.entity';

export class PaginatedCustomers {
  items!: Customer[];
  total!: number;
  page!: number;
  limit!: number;
}

export class CustomerRepository extends EntityRepository<Customer> {
  constructor(em: EntityManager) {
    super(em, Customer);
  }

  async findPaginated(
    restaurantId: string,
    {
      search,
      sortBy = CustomerSortBy.LATEST,
      onlyInactive = false,
      page = 1,
      limit = 20,
    }: GetCustomersQueryDto,
  ): Promise<PaginatedCustomers> {
    const where: FilterQuery<Customer> = { restaurant: restaurantId };
    const andConditions: FilterQuery<Customer>[] = [];

    if (search) {
      andConditions.push({
        $or: [
          {
            user: {
              person: {
                $or: [
                  { firstName: { $ilike: `%${search}%` } },
                  { lastName: { $ilike: `%${search}%` } },
                ],
              },
            },
          },
          { user: { authUser: { email: { $ilike: `%${search}%` } } } },
          { user: { linkCode: { $ilike: `%${search}%` } } },
        ],
      });
    }

    if (onlyInactive) {
      andConditions.push({
        $or: [{ lastVisitDate: { $lt: Customer.inactiveThreshold() } }, { lastVisitDate: null }],
      });
    }

    where.$and = andConditions;

    const [customers, total] = await this.findAndCount(where, {
      populate: ['user', 'user.authUser', 'user.person'],
      limit,
      offset: (page - 1) * limit,
      orderBy:
        sortBy === CustomerSortBy.TOP ? { totalPointsGained: 'DESC' } : { createdAt: 'DESC' },
    });

    return {
      items: customers,
      total,
      page,
      limit,
    };
  }

  async addPointsForRestaurant(
    restaurantId: string,
    customerId: string,
    dto: AddCustomerPointsDto,
  ): Promise<Customer | null> {
    const customer = await this.findOne(
      { id: customerId, restaurant: restaurantId },
      { populate: ['user', 'user.authUser', 'user.person'] },
    );
    if (!customer) return null;

    customer.points += dto.amount;
    customer.totalPointsGained += dto.amount;

    this.em.create(PointsTransaction, {
      customer,
      amount: dto.amount,
      reason: dto.reason,
    } as RequiredEntityData<PointsTransaction>);

    await this.em.flush();
    return customer;
  }
}
