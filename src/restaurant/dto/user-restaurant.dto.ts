/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Exclude, Expose, Transform, Type, plainToInstance } from 'class-transformer';

import { RewardDto } from '../../reward/dto/reward.dto';
import { RestaurantDto } from './restaurant.dto';

/** Carte de fidélité de l'utilisateur dans ce restaurant */
@Exclude()
export class RestaurantLoyaltyDto {
  @Expose() points!: number;
  @Expose() totalPointsGained!: number;
  @Expose() lastVisitDate?: Date;
  @Expose() availableRewardCount!: number;

  /** null quand toutes les récompenses sont atteintes, ou que le restaurant n'en a pas */
  @Expose()
  @Type(() => RewardDto)
  nextReward!: RewardDto | null;
}

@Exclude()
export class UserRestaurantDto extends RestaurantDto {
  @Expose()
  @Type(() => RestaurantLoyaltyDto)
  loyalty!: RestaurantLoyaltyDto;
}

@Exclude()
export class PaginatedUserRestaurantsDto {
  @Expose()
  @Transform(({ obj }) =>
    plainToInstance(UserRestaurantDto, obj.items ?? [], { excludeExtraneousValues: true }),
  )
  items!: UserRestaurantDto[];

  @Expose() total!: number;
  @Expose() page!: number;
  @Expose() limit!: number;
}
