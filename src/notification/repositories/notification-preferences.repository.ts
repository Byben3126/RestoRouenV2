import { EntityRepository, RequiredEntityData } from '@mikro-orm/postgresql';

import { Customer } from '../../customer/entities/customer.entity';
import { UpdateNotificationPreferencesDto } from '../dto/notification-preferences.dto';
import { NotificationPreferences } from '../entities/notification-preferences.entity';
import type { NotificationCategory } from '../notification-preferences.service';

export class NotificationPreferencesRepository extends EntityRepository<NotificationPreferences> {
  findByUser(userId: string): Promise<NotificationPreferences | null> {
    return this.findOne({ user: userId });
  }

  /** Crée la ligne à la première modification (avant, tout est activé par défaut) */
  async updateForUser(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    const preferences =
      (await this.findByUser(userId)) ??
      this.create({ user: userId } as RequiredEntityData<NotificationPreferences>);
    // Les catégories non envoyées sont undefined dans le DTO : on les garde telles quelles
    this.assign(preferences, dto, { ignoreUndefined: true });
    await this.em.flush();
    return preferences;
  }

  /** false si l'utilisateur n'est pas client de ce restaurant ou en a coupé les notifications */
  async isRestaurantEnabled(userId: string, restaurantId: string): Promise<boolean> {
    const count = await this.em.count(Customer, {
      user: userId,
      restaurant: { id: restaurantId, isActive: true },
      notificationsEnabled: true,
    });
    return count > 0;
  }

  /** Parmi ces utilisateurs, ceux qui ont coupé cette catégorie */
  async findUsersWithCategoryDisabled(
    userIds: string[],
    category: NotificationCategory,
  ): Promise<string[]> {
    const preferences = await this.find(
      { user: { $in: userIds }, [category]: false },
      { fields: ['user'] },
    );
    return preferences.map((p) => p.user.id);
  }

  /** Parmi ces utilisateurs, les clients de ce restaurant qui n'en ont pas coupé les notifications */
  async findUsersWithRestaurantEnabled(userIds: string[], restaurantId: string): Promise<string[]> {
    const customers = await this.em.find(
      Customer,
      {
        user: { $in: userIds },
        restaurant: { id: restaurantId, isActive: true },
        notificationsEnabled: true,
      },
      { fields: ['user'] },
    );
    return customers.map((c) => c.user.id);
  }

  /** null si l'utilisateur n'est pas client de ce restaurant */
  findCustomer(userId: string, restaurantId: string): Promise<Customer | null> {
    return this.em.findOne(
      Customer,
      { user: userId, restaurant: { id: restaurantId, isActive: true } },
      { populate: ['restaurant'] },
    );
  }

  /** null si l'utilisateur n'est pas client de ce restaurant */
  async setRestaurantEnabled(
    userId: string,
    restaurantId: string,
    enabled: boolean,
  ): Promise<Customer | null> {
    const customer = await this.em.findOne(
      Customer,
      { user: userId, restaurant: { id: restaurantId, isActive: true } },
      { populate: ['restaurant'] },
    );
    if (!customer) return null;

    customer.notificationsEnabled = enabled;
    await this.em.flush();
    return customer;
  }
}
