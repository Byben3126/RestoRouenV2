/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Exclude, Expose, Transform, plainToInstance } from 'class-transformer';

import { MediaDto } from '../../common/dto/media.dto';
import { OutletDto } from './outlet.dto';

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
