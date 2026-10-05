import { faker } from '@faker-js/faker';
import { Dictionary, EntityManager } from '@mikro-orm/core';
import { Seeder } from '@mikro-orm/seeder';

import { AppUser } from '../../user/entities/app-user.entity';
import { Outlet } from '../entities/outlet.entity';
import { RestaurantFactory } from './restaurant.factory';

const ROUEN_CENTER = { lat: 49.4432, lng: 1.0993 };

function nearRouen() {
  return {
    latitude: ROUEN_CENTER.lat + (Math.random() - 0.5) * 0.05,
    longitude: ROUEN_CENTER.lng + (Math.random() - 0.5) * 0.05,
  };
}

export class RestaurantDataSeeder extends Seeder {
  async run(em: EntityManager, context: Dictionary): Promise<void> {
    const restaurantOwnerIds: string[] = context.restaurantOwnerIds as string[];
    const restaurantIds: string[] = [];

    for (const appUserId of restaurantOwnerIds) {
      const user = em.getReference(AppUser, appUserId);
      const restaurant = await new RestaurantFactory(em).createOne({ user });
      restaurantIds.push(restaurant.id);

      const outletCount = faker.number.int({ min: 1, max: 3 });
      for (let i = 0; i < outletCount; i++) {
        const { latitude, longitude } = nearRouen();
        em.create(Outlet, {
          restaurant,
          name: i === 0 ? 'Principal' : faker.location.street(),
          latitude,
          longitude,
          formattedAddress: faker.location.streetAddress({ useFullAddress: true }),
          isActive: true,
        } as any);
      }

      await em.flush();
    }

    context.restaurantIds = restaurantIds;
  }
}
