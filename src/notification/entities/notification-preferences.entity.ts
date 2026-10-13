import { Entity, EntityRepositoryType, OneToOne, Property } from '@mikro-orm/core';

import { AppUser } from '../../user/entities/app-user.entity';
import { NotificationPreferencesRepository } from '../repositories/notification-preferences.repository';

/**
 * Catégories de notifications que l'utilisateur peut activer ou couper.
 * Pas de ligne en base tant qu'il n'a rien modifié : tout est activé par défaut.
 */
@Entity({ repository: () => NotificationPreferencesRepository })
export class NotificationPreferences {
  [EntityRepositoryType]?: NotificationPreferencesRepository;

  @OneToOne(() => AppUser, { primary: true, fieldName: 'user_id', deleteRule: 'cascade' })
  user!: AppUser;

  /** Points crédités lors d'une visite */
  @Property()
  points: boolean = true;

  /** Récompenses débloquées */
  @Property()
  rewards: boolean = true;

  /** Nouvelles promotions */
  @Property()
  promotions: boolean = true;

  /** Demandes d'avis après une visite */
  @Property()
  ratings: boolean = true;

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
