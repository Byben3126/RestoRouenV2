import { LockMode } from '@mikro-orm/core';
import { EntityRepository, RequiredEntityData } from '@mikro-orm/postgresql';

import { Customer } from '../../customer/entities/customer.entity';
import { CreateRatingDto } from '../dto/create-rating.dto';
import { Rating } from '../entities/rating.entity';

export class RatingRepository extends EntityRepository<Rating> {
  /**
   * Note la dernière visite du client et met à jour la moyenne du restaurant.
   * null si le client n'a pas de visite à noter.
   */
  async rateLastVisit(
    userId: string,
    restaurantId: string,
    { globalRating }: CreateRatingDto,
  ): Promise<Rating | null> {
    return this.em.transactional(async (em) => {
      // Verrouille le client : deux requêtes en parallèle ne peuvent pas noter la même visite
      const customer = await em.findOne(
        Customer,
        { user: userId, restaurant: restaurantId, canSubmitRating: true },
        { lockMode: LockMode.PESSIMISTIC_WRITE },
      );
      if (!customer) return null;

      customer.canSubmitRating = false;
      const rating = em.create(Rating, { customer, globalRating } as RequiredEntityData<Rating>);
      // Calculée en SQL pour ne perdre aucune note donnée en même temps par un autre client
      await em.execute(
        `update restaurant
        set average_rating = (average_rating * review_count + ?) / (review_count + 1),
          review_count = review_count + 1
        where id = ?`,
        [globalRating, restaurantId],
      );
      await em.flush();
      return rating;
    });
  }
}
