/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Exclude, Expose, Transform, plainToInstance } from 'class-transformer';

import { MediaDto } from '../../common/dto/media.dto';
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

@Exclude()
export class NearbyRestaurantDto extends RestaurantDto {
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
    plainToInstance(RestaurantDto, obj.items ?? [], { excludeExtraneousValues: true }),
  )
  items!: RestaurantDto[];

  @Expose() total!: number;
  @Expose() page!: number;
  @Expose() limit!: number;
}
