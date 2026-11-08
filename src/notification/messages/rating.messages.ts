import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { PushMessage } from '../push-notification.service';
import { Localized } from './localized';

/** Demande d'avis envoyée peu après une visite */
export function ratingRequestMessage(restaurant: Pick<Restaurant, 'id' | 'name'>): PushMessage {
  return {
    headings: {
      fr: `Comment s'est passée votre visite chez ${restaurant.name} ?`,
      en: `How was your visit to ${restaurant.name}?`,
      es: `¿Qué tal tu visita a ${restaurant.name}?`,
    } satisfies Localized,
    contents: {
      fr: 'Donnez-lui une note en un geste.',
      en: 'Rate it in one tap.',
      es: 'Valóralo en un toque.',
    } satisfies Localized,
    data: { type: 'rating.request', restaurantId: restaurant.id },
  };
}
