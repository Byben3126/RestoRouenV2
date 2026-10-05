import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@mikro-orm/nestjs';

import { SubscriptionService } from '../subscription/subscription.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantRepository } from './repositories/restaurant.repository';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepository: RestaurantRepository,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async createMyRestaurant(userId: string, dto: CreateRestaurantDto): Promise<Restaurant> {
    const existing = await this.restaurantRepository.findOne({ user: userId });
    if (existing) throw new ConflictException('Restaurant already exists for this user');

    await this.subscriptionService.ensureStripeCustomer(userId);
    const restaurant = await this.restaurantRepository.createOne(userId, dto);
    return this.restaurantRepository.loadWithMedias(restaurant);
  }

  async getMyRestaurant(userId: string): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.findByUserId(userId);
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  async updateMyRestaurant(userId: string, dto: UpdateRestaurantDto): Promise<Restaurant> {
    const restaurant = await this.restaurantRepository.updateForUser(userId, dto);
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }
}
