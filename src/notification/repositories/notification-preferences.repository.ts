import { EntityRepository, RequiredEntityData } from '@mikro-orm/postgresql';

import { Customer } from '../../customer/entities/customer.entity';
import { UpdateNotificationPreferencesDto } from '../dto/notification-preferences.dto';
import { NotificationPreferences } from '../entities/notification-preferences.entity';

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
    this.assign(preferences, dto);
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
