import { EntityRepository } from '@mikro-orm/postgresql';

import { Media } from '../../media/entities/media.entity';
import { UpdateRestaurantDto } from '../dto/update-restaurant.dto';
import { Outlet } from '../entities/outlet.entity';
import { Restaurant } from '../entities/restaurant.entity';

export type NearbyOutlet = Outlet & { distance: number };
export type NearbyRestaurant = Restaurant & { nearbyOutlets: NearbyOutlet[] };

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

  /**
   * Restaurants actifs ayant au moins un point de vente actif dans le rayon (en km).
   * Chaque restaurant porte ses points de vente du rayon, du plus proche au plus loin, avec leur
   * distance en mètres (Haversine). Les restaurants sont triés par leur point de vente le plus proche.
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number,
    page: number,
    limit: number,
  ): Promise<{ items: NearbyRestaurant[]; total: number }> {
    const inRadius = `with outlet_distance as (
        select * from (
          select o.restaurant_id, o.id as outlet_id,
            2 * 6371000 * asin(least(1, sqrt(
              power(sin(radians(o.latitude - ?) / 2), 2)
              + cos(radians(?)) * cos(radians(o.latitude)) * power(sin(radians(o.longitude - ?) / 2), 2)
            ))) as distance
          from outlet o
          join restaurant r on r.id = o.restaurant_id
          where o.is_active and r.is_active and o.latitude is not null and o.longitude is not null
        ) d
        where distance <= ?
      )`;
    const params = [latitude, latitude, longitude, radiusKm * 1000];

    const [rows, [{ total }]] = await Promise.all([
      this.em.execute<{ restaurant_id: string; outlet_id: string; distance: number }[]>(
        `${inRadius},
        restaurant_page as (
          select od.restaurant_id, min(od.distance) as min_distance, r.average_rating
          from outlet_distance od
          join restaurant r on r.id = od.restaurant_id
          group by od.restaurant_id, r.average_rating
          order by min_distance, r.average_rating desc, od.restaurant_id
          limit ? offset ?
        )
        select od.restaurant_id, od.outlet_id, round(od.distance) as distance
        from outlet_distance od
        join restaurant_page p on p.restaurant_id = od.restaurant_id
        order by p.min_distance, p.average_rating desc, p.restaurant_id, od.distance`,
        [...params, limit, (page - 1) * limit],
      ),
      this.em.execute<{ total: string }[]>(
        `${inRadius} select count(distinct restaurant_id) as total from outlet_distance`,
        params,
      ),
    ]);

    const restaurantIds = [...new Set(rows.map((row) => row.restaurant_id))];
    const [restaurants, outlets]: [Restaurant[], Outlet[]] = rows.length
      ? await Promise.all([
          this.find({ id: { $in: restaurantIds } }),
          this.em.find(Outlet, { id: { $in: rows.map((row) => row.outlet_id) } }),
        ])
      : [[], []];
    await this.loadMediasForMany(restaurants);

    const items = restaurantIds
      .map((id) => restaurants.find((r) => r.id === id))
      .filter((restaurant): restaurant is Restaurant => restaurant !== undefined)
      .map((restaurant) => {
        const nearbyOutlets = rows
          .filter((row) => row.restaurant_id === restaurant.id)
          .map((row) => {
            const outlet = outlets.find((o) => o.id === row.outlet_id)!;
            return Object.assign(outlet, { distance: Number(row.distance) });
          });
        return Object.assign(restaurant, { nearbyOutlets });
      });

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
