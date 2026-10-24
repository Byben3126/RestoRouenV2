import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@mikro-orm/nestjs';

import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { NotificationPreferencesRepository } from './repositories/notification-preferences.repository';

export type NotificationCategory = 'points' | 'rewards' | 'promotions' | 'ratings';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreferences)
    private readonly preferencesRepository: NotificationPreferencesRepository,
  ) {}

  /** Tout est activé tant que l'utilisateur n'a rien modifié */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    return (await this.preferencesRepository.findByUser(userId)) ?? new NotificationPreferences();
  }

  updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferences> {
    return this.preferencesRepository.updateForUser(userId, dto);
  }

  /**
   * L'utilisateur veut-il recevoir cette catégorie de notification ?
   * Avec un restaurant, il ne doit pas non plus l'avoir coupé.
   * Sans restaurant, c'est une notification de l'app : seule la catégorie compte.
   */
  async isEnabled(
    userId: string,
    category: NotificationCategory,
    restaurantId?: string,
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    if (!preferences[category]) return false;
    if (!restaurantId) return true;
    return this.preferencesRepository.isRestaurantEnabled(userId, restaurantId);
  }

  /** Comme isEnabled, pour plusieurs utilisateurs : ceux qui veulent recevoir cette notification */
  async filterEnabled(
    userIds: string[],
    category: NotificationCategory,
    restaurantId?: string,
  ): Promise<string[]> {
    const disabled = new Set(
      await this.preferencesRepository.findUsersWithCategoryDisabled(userIds, category),
    );
    const enabled = userIds.filter((userId) => !disabled.has(userId));
    if (!restaurantId || enabled.length === 0) return enabled;
    return this.preferencesRepository.findUsersWithRestaurantEnabled(enabled, restaurantId);
  }

  /** Les notifications de ce restaurant sont-elles activées ? */
  async getRestaurantSetting(userId: string, restaurantId: string) {
    const customer = await this.preferencesRepository.findCustomer(userId, restaurantId);
    if (!customer) throw new NotFoundException('Not a customer of this restaurant');
    return { restaurant: customer.restaurant, enabled: customer.notificationsEnabled };
  }

  async setRestaurantEnabled(userId: string, restaurantId: string, enabled: boolean) {
    const customer = await this.preferencesRepository.setRestaurantEnabled(
      userId,
      restaurantId,
      enabled,
    );
    if (!customer) throw new NotFoundException('Not a customer of this restaurant');
    return { restaurant: customer.restaurant, enabled: customer.notificationsEnabled };
  }
}
