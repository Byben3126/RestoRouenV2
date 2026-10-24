import { Restaurant } from '../../restaurant/entities/restaurant.entity';
import { PushMessage } from '../push-notification.service';
import { Localized } from './localized';

/** Points crédités lors d'une visite */
export function pointsAddedMessage(
  amount: number,
  balance: number,
  restaurant: Pick<Restaurant, 'id' | 'name'>,
): PushMessage {
  const s = amount > 1 ? 's' : '';
  return {
    headings: {
      fr: `+${amount} point${s} chez ${restaurant.name} !`,
      en: `+${amount} point${s} at ${restaurant.name}!`,
      es: `¡+${amount} punto${s} en ${restaurant.name}!`,
    } satisfies Localized,
    contents: {
      fr: `Votre solde : ${balance} points.`,
      en: `Your balance: ${balance} points.`,
      es: `Tu saldo: ${balance} puntos.`,
    } satisfies Localized,
    data: { type: 'points.added', restaurantId: restaurant.id },
  };
}
