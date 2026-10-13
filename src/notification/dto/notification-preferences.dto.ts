/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose, Transform, plainToInstance } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

@Exclude()
export class NotificationPreferencesDto {
  @Expose() points!: boolean;
  @Expose() rewards!: boolean;
  @Expose() promotions!: boolean;
  @Expose() ratings!: boolean;
}

/** Seules les catégories envoyées sont modifiées */
export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  points?: boolean;

  @IsOptional()
  @IsBoolean()
  rewards?: boolean;

  @IsOptional()
  @IsBoolean()
  promotions?: boolean;

  @IsOptional()
  @IsBoolean()
  ratings?: boolean;
}

@Exclude()
export class NotificationRestaurantDto {
  @Expose() id!: string;
  @Expose() name!: string;
}

@Exclude()
export class RestaurantNotificationSettingDto {
  @ApiProperty({ type: () => NotificationRestaurantDto })
  @Expose()
  @Transform(({ obj }) =>
    plainToInstance(NotificationRestaurantDto, obj.restaurant, { excludeExtraneousValues: true }),
  )
  restaurant!: NotificationRestaurantDto;

  /** false : toutes les notifications de ce restaurant sont coupées */
  @Expose() enabled!: boolean;
}

export class UpdateRestaurantNotificationSettingDto {
  @IsBoolean()
  enabled!: boolean;
}
