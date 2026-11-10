/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose, Transform, plainToInstance } from 'class-transformer';

import { NotificationRestaurantDto } from './notification-preferences.dto';

@Exclude()
export class NotificationDto {
  @Expose() id!: string;

  /** Par langue (fr, en, es) ; en est toujours présente */
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { fr: '+50 points chez Le Bistrot !', en: '+50 points at Le Bistrot!' },
  })
  @Expose()
  headings!: Record<string, string>;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    example: { fr: 'Votre solde : 150 points.', en: 'Your balance: 150 points.' },
  })
  @Expose()
  contents!: Record<string, string>;

  /** type (ex. points.added) et identifiants utiles à la navigation */
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    nullable: true,
    example: { type: 'points.added', restaurantId: 'uuid' },
  })
  @Expose()
  data!: Record<string, unknown> | null;

  /** null : notification de l'app, hors restaurant */
  @ApiProperty({ type: () => NotificationRestaurantDto, nullable: true })
  @Expose()
  @Transform(({ obj }) =>
    plainToInstance(NotificationRestaurantDto, obj.restaurant ?? null, {
      excludeExtraneousValues: true,
    }),
  )
  restaurant!: NotificationRestaurantDto | null;

  /** null tant que l'utilisateur ne l'a pas lue */
  @Expose() readAt!: Date | null;
  @Expose() createdAt!: Date;
}

@Exclude()
export class NotificationPageDto {
  @ApiProperty({ type: () => NotificationDto, isArray: true })
  @Expose()
  @Transform(({ obj }) =>
    plainToInstance(NotificationDto, obj.items ?? [], { excludeExtraneousValues: true }),
  )
  items!: NotificationDto[];

  /** À renvoyer en `after` pour la page suivante ; null quand il n'y en a plus */
  @Expose() nextCursor!: string | null;
}

@Exclude()
export class HasUnreadNotificationsDto {
  @Expose() hasUnread!: boolean;
}
