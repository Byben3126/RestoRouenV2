import { EntityRepository } from '@mikro-orm/postgresql';

import { Media } from '../../../../media/src/media/entities/media.entity';
import { UpdateRestaurantDto } from '../dto/update-restaurant.dto';
import { Restaurant } from '../entities/restaurant.entity';

export class RestaurantRepository extends EntityRepository<Restaurant> {
  async createOne(
    userId: string,
    data: Pick<Restaurant, 'name' | 'latitude' | 'longitude'>,
  ): Promise<Restaurant> {
    const restaurant = this.em.create(Restaurant, { user: userId as any, ...data } as any);
    await this.em.flush();
    return restaurant;
  }

  async findByUserId(userId: string): Promise<Restaurant | null> {
    const restaurant = await this.findOne({ user: userId });
    if (!restaurant) return null;
    return this.loadWithMedias(restaurant);
  }

  async updateForUser(userId: string, dto: UpdateRestaurantDto): Promise<Restaurant | null> {
    const { mediaIds, ...fields } = dto;
    const restaurant = await this.findOne({ user: userId });
    if (!restaurant) return null;

    this.em.assign(restaurant, fields);
    if (mediaIds !== undefined) restaurant.mediaIds = mediaIds;

    await this.em.flush();
    return this.loadWithMedias(restaurant);
  }

  async loadWithMedias(restaurant: Restaurant): Promise<Restaurant> {
    if (restaurant.mediaIds?.length) {
      const found = await this.em.find(Media, { id: { $in: restaurant.mediaIds } });
      restaurant.medias = restaurant.mediaIds
        .map((id) => found.find((m) => m.id === id)!)
        .filter(Boolean);
    } else {
      restaurant.medias = [];
    }
    return restaurant;
  }
}
