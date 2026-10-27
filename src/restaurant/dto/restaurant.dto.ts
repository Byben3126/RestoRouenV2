/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose, Transform, Type, plainToInstance } from 'class-transformer';

import { MediaDto } from '../../common/dto/media.dto';
import { RewardDto } from '../../reward/dto/reward.dto';
import { NearbyOutletDto, OutletDto } from './outlet.dto';

@Exclude()
export class RestaurantDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() averageRating!: number;
  @Expose() reviewCount!: number;
  @Expose() isActive!: boolean;
  @Expose() cloudwaitressId?: string;
  @Expose() cloudwaitressUrl?: string;
  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;

  @Expose()
  @Transform(({ obj }) =>
    plainToInstance(MediaDto, obj.medias ?? [], { excludeExtraneousValues: true }),
  )
  medias!: MediaDto[];

  @Expose()
  @Transform(({ obj }) =>
    plainToInstance(OutletDto, obj.outlets?.isInitialized?.() ? obj.outlets.getItems() : [], {
      excludeExtraneousValues: true,
    }),
  )
  outlets!: OutletDto[];
}

/** Carte de fidélité de l'utilisateur dans ce restaurant */
@Exclude()
export class RestaurantLoyaltyDto {
  @Expose() points!: number;
  @Expose() totalPointsGained!: number;
  @Expose() lastVisitDate?: Date;
  @Expose() availableRewardCount!: number;

  /** null quand toutes les récompenses sont atteintes, ou que le restaurant n'en a pas */
  @ApiProperty({ type: () => RewardDto, nullable: true })
  @Expose()
  @Type(() => RewardDto)
  nextReward!: RewardDto | null;
}

/** Restaurant vu par un utilisateur, avec sa carte de fidélité */
@Exclude()
export class UserRestaurantDto extends RestaurantDto {
  /** null tant que l'utilisateur n'a pas de carte dans ce restaurant */
  @Expose()
  @Type(() => RestaurantLoyaltyDto)
  loyalty!: RestaurantLoyaltyDto | null;
}

@Exclude()
export class NearbyRestaurantDto extends UserRestaurantDto {
  /** Uniquement les points de vente du rayon, du plus proche au plus loin */
  @Expose()
  @Transform(({ obj }) =>
    plainToInstance(NearbyOutletDto, obj.nearbyOutlets ?? [], { excludeExtraneousValues: true }),
  )
  override outlets: NearbyOutletDto[] = [];
}

@Exclude()
export class PaginatedNearbyRestaurantsDto {
  @Expose()
  @Transform(({ obj }) =>
    plainToInstance(NearbyRestaurantDto, obj.items ?? [], { excludeExtraneousValues: true }),
  )
  items!: NearbyRestaurantDto[];

  @Expose() total!: number;
  @Expose() page!: number;
  @Expose() limit!: number;
}

@Exclude()
export class PaginatedRestaurantsDto {
  @Expose()
  @Transform(({ obj }) =>
    plainToInstance(UserRestaurantDto, obj.items ?? [], { excludeExtraneousValues: true }),
  )
  items!: UserRestaurantDto[];

  @Expose() total!: number;
  @Expose() page!: number;
  @Expose() limit!: number;
}
