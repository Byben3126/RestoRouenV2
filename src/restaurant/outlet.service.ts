import { Injectable, NotFoundException } from '@nestjs/common';

import { EntityManager } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';

import { GooglePlacesService } from '../google/google-places.service';
import { CreateOutletDto, UpdateOutletDto } from './dto/outlet.dto';
import { Outlet } from './entities/outlet.entity';
import { Restaurant } from './entities/restaurant.entity';
import { OutletRepository } from './repositories/outlet.repository';
import { RestaurantRepository } from './repositories/restaurant.repository';

@Injectable()
export class OutletService {
  constructor(
    @InjectRepository(Outlet)
    private readonly outletRepository: OutletRepository,
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: RestaurantRepository,
    private readonly em: EntityManager,
    private readonly googlePlaces: GooglePlacesService,
  ) {}

  async listOutlets(userId: string): Promise<Outlet[]> {
    const restaurant = await this.restaurantRepository.findOne({ user: userId });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return this.outletRepository.findByRestaurant(restaurant.id);
  }

  async createOutlet(userId: string, dto: CreateOutletDto): Promise<Outlet> {
    const restaurant = await this.restaurantRepository.findOne({ user: userId });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const placeId = dto.placeId ?? (await this.findPlaceId(dto));
    const outlet = this.em.create(Outlet, { restaurant, ...dto, placeId } as any);
    await this.em.flush();
    return outlet;
  }

  async updateOutlet(userId: string, outletId: string, dto: UpdateOutletDto): Promise<Outlet> {
    const restaurant = await this.restaurantRepository.findOne({ user: userId });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const outlet = await this.outletRepository.findOne({ id: outletId, restaurant: restaurant.id });
    if (!outlet) throw new NotFoundException('Outlet not found');

    const patch = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    this.em.assign(outlet, patch);
    const moved = [dto.name, dto.latitude, dto.longitude].some((v) => v !== undefined);
    // Nom ou position modifiés : l'ancien place_id ne correspond peut-être plus
    if (moved && dto.placeId === undefined) {
      this.em.assign(outlet, { placeId: await this.findPlaceId(outlet) });
    }
    await this.em.flush();
    return outlet;
  }

  /** place_id Google du point de vente, retrouvé par son nom et ses coordonnées */
  private async findPlaceId({
    name,
    latitude,
    longitude,
  }: Pick<Outlet, 'name' | 'latitude' | 'longitude'>): Promise<string | null> {
    if (latitude == null || longitude == null) return null;
    return this.googlePlaces.findPlaceId(name, { lat: latitude, lng: longitude });
  }

  async deleteOutlet(userId: string, outletId: string): Promise<void> {
    const restaurant = await this.restaurantRepository.findOne({ user: userId });
    if (!restaurant) throw new NotFoundException('Restaurant not found');

    const outlet = await this.outletRepository.findOne({ id: outletId, restaurant: restaurant.id });
    if (!outlet) throw new NotFoundException('Outlet not found');

    await this.em.removeAndFlush(outlet);
  }
}
