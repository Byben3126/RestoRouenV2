import { EntityRepository } from '@mikro-orm/postgresql';

import { Media } from '../../media/entities/media.entity';
import { UpdateRestaurantDto } from '../dto/update-restaurant.dto';
import { Restaurant } from '../entities/restaurant.entity';

export class RestaurantRepository extends EntityRepository<Restaurant> {
  async createOne(userId: string, data: Pick<Restaurant, 'name'>): Promise<Restaurant> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const restaurant = this.em.create(Restaurant, { user: userId as any, ...data } as any);
    await this.em.flush();
    return restaurant;
  }

  async findByUserId(userId: string): Promise<Restaurant | null> {
    const restaurant = await this.findOne({ user: userId });
    if (!restaurant) return null;
    return this.loadWithMedias(restaurant);
  }

  async findActiveById(restaurantId: string): Promise<Restaurant | null> {
    const restaurant = await this.findOne(
      { id: restaurantId, isActive: true },
      { populate: ['outlets'] },
    );
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

  /**
   * Recherche par nom, insensible à la casse et aux accents, tolérante aux fautes de frappe (pg_trgm).
   * Tri : noms qui commencent par la saisie, puis qui la contiennent, puis par similarité, puis par note.
   */
  async searchByName(
    q: string,
    page: number,
    limit: number,
  ): Promise<{ items: Restaurant[]; total: number }> {
    const contains = `%${escapeLike(q)}%`;
    const startsWith = `${escapeLike(q)}%`;
    const where = `r.is_active = true
      and (unaccent(r.name) ilike unaccent(?)
        or word_similarity(unaccent(?), unaccent(r.name)) >= ${SEARCH_SIMILARITY_THRESHOLD})`;

    const [rows, [{ total }]] = await Promise.all([
      this.em.execute<{ id: string }[]>(
        `select r.id from restaurant r
        where ${where}
        order by
          unaccent(r.name) ilike unaccent(?) desc,
          unaccent(r.name) ilike unaccent(?) desc,
          word_similarity(unaccent(?), unaccent(r.name)) desc,
          r.average_rating desc,
          r.id
        limit ? offset ?`,
        [contains, q, startsWith, contains, q, limit, (page - 1) * limit],
      ),
      this.em.execute<{ total: string }[]>(
        `select count(*) as total from restaurant r where ${where}`,
        [contains, q],
      ),
    ]);

    const ids = rows.map((row) => row.id);
    const found = ids.length ? await this.find({ id: { $in: ids } }) : [];
    const items = ids.map((id) => found.find((r) => r.id === id)!).filter(Boolean);
    await this.loadMediasForMany(items);

    return { items, total: Number(total) };
  }

  async loadWithMedias(restaurant: Restaurant): Promise<Restaurant> {
    await this.loadMediasForMany([restaurant]);
    return restaurant;
  }

  private async loadMediasForMany(restaurants: Restaurant[]): Promise<void> {
    const mediaIds = restaurants.flatMap((r) => r.mediaIds ?? []);
    const found = mediaIds.length ? await this.em.find(Media, { id: { $in: mediaIds } }) : [];
    for (const restaurant of restaurants) {
      restaurant.medias = (restaurant.mediaIds ?? [])
        .map((id) => found.find((m) => m.id === id)!)
        .filter(Boolean);
    }
  }
}

const SEARCH_SIMILARITY_THRESHOLD = 0.5;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}
