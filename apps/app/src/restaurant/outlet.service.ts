import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@mikro-orm/nestjs';
import { EntityManager } from '@mikro-orm/core';

import { RestaurantRepository } from './repositories/restaurant.repository';
import { OutletRepository } from './repositories/outlet.repository';
import { Outlet } from './entities/outlet.entity';
import { Restaurant } from './entities/restaurant.entity';
import { CreateOutletDto, UpdateOutletDto } from './dto/outlet.dto';

@Injectable()
export class OutletService {
  constructor(
    @InjectRepository(Outlet)
    private readonly outletRepository: OutletRepository,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: RestaurantRepository,
    private readonly em: EntityManager,
  ) {}

  async listOutlets(userId: string): Promise<Outlet[]> {
    const restaurant = await this.restaurantRepository.findOne({ user: userId });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return this.outletRepository.findByRestaurant(restaurant.id);
  }

  async createOutlet(userId: string, dto: CreateOutletDto): Promise<Outlet> {
    const restaurant = await this.restaurantRepository.findOne({ user: userId });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const outlet = this.em.create(Outlet, { restaurant, ...dto } as any);
    await this.em.flush();
    return outlet;
  }

  async updateOutlet(userId: string, outletId: string, dto: UpdateOutletDto): Promise<Outlet> {
    const restaurant = await this.restaurantRepository.findOne({ user: userId });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const outlet = await this.outletRepository.findOne({ id: outletId, restaurant: restaurant.id });
    if (!outlet) throw new NotFoundException('Outlet not found');

    const patch = Object.fromEntries(
      Object.entries(dto).filter(([, v]) => v !== undefined),
    );
    this.em.assign(outlet, patch);
    await this.em.flush();
    return outlet;
  }

  async deleteOutlet(userId: string, outletId: string): Promise<void> {
    const restaurant = await this.restaurantRepository.findOne({ user: userId });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const outlet = await this.outletRepository.findOne({ id: outletId, restaurant: restaurant.id });
    if (!outlet) throw new NotFoundException('Outlet not found');

    await this.em.removeAndFlush(outlet);
  }
}
