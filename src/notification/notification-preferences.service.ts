import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectRepository } from '@mikro-orm/nestjs';

import { UpdateNotificationPreferencesDto } from './dto/notification-preferences.dto';
import { NotificationPreferences } from './entities/notification-preferences.entity';
import { NotificationPreferencesRepository } from './repositories/notification-preferences.repository';

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

  async getRestaurantSettings(userId: string) {
    const customers = await this.preferencesRepository.findCustomersOfUser(userId);
    return customers.map((c) => ({ restaurant: c.restaurant, enabled: c.notificationsEnabled }));
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
