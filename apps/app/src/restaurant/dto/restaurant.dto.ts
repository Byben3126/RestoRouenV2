import { Exclude, Expose, Transform, plainToInstance } from 'class-transformer';

import { MediaDto } from '../../common/dto/media.dto';

@Exclude()
export class RestaurantDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() latitude?: number;
  @Expose() longitude?: number;
  @Expose() country?: string;
  @Expose() city?: string;
  @Expose() formattedAddress?: string;
  @Expose() placeId?: string;
  @Expose() googleMyBusinessLink?: string;
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
}
