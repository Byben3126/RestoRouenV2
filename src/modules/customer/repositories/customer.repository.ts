import {
  EntityManager,
  EntityRepository,
  FilterQuery,
  LockMode,
  RequiredEntityData,
} from '@mikro-orm/postgresql';

import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { AppUser } from '../../user/entities/app-user.entity';
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
      andConditions.push(Customer.inactiveFilter());
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

    customer.addPoints(dto.amount, dto.reason);

    await this.em.flush();
    return customer;
  }

  /**
   * Client du restaurant dont la carte porte ce code, créé au premier scan.
   * null si aucun utilisateur n'a ce code.
   */
  async findOrCreateByLinkCode(restaurantId: string, linkCode: string): Promise<Customer | null> {
    const user = await this.em.findOne(AppUser, { linkCode });
    if (!user) return null;

    const populate = ['user', 'user.authUser', 'user.person'] as const;
    const existing = await this.findOne({ user, restaurant: restaurantId }, { populate });
    if (existing) return existing;

    const customer = this.create({
      user,
      restaurant: restaurantId,
    } as RequiredEntityData<Customer>);
    await this.em.flush();
    return this.findOneOrFail({ id: customer.id }, { populate, refresh: true });
  }

  /**
   * Client verrouillé jusqu'à la fin de la transaction en cours, créé s'il n'existe pas encore.
   * Deux crédits en parallèle s'additionnent au lieu de s'écraser.
   */
  async findOrCreateLocked(user: AppUser, restaurant: Restaurant): Promise<Customer> {
    return (
      (await this.findOne({ user, restaurant }, { lockMode: LockMode.PESSIMISTIC_WRITE })) ??
      this.create({ user, restaurant } as RequiredEntityData<Customer>)
    );
  }

  async findPointsTransactions(
    restaurantId: string,
    customerId: string,
  ): Promise<PointsTransaction[] | null> {
    const customer = await this.findOne({ id: customerId, restaurant: restaurantId });
    if (!customer) return null;

    return this.em.find(
      PointsTransaction,
      { customer: customerId },
      { orderBy: { createdAt: 'DESC' } },
    );
  }

  /** Historique de la carte de l'utilisateur dans ce restaurant ; vide s'il n'en a pas */
  findPointsTransactionsPageForUser(
    userId: string,
    restaurantId: string,
    limit: number,
    after?: string,
  ) {
    return this.em.findByCursor(
      PointsTransaction,
      { customer: { user: userId, restaurant: restaurantId } },
      { first: limit, after, orderBy: { createdAt: 'DESC', id: 'DESC' }, includeCount: false },
    );
  }
}
