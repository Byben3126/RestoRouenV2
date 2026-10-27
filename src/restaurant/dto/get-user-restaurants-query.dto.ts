import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum UserRestaurantSortBy {
  POINTS = 'points',
  TOTAL_POINTS_GAINED = 'totalPointsGained',
  LAST_VISIT = 'lastVisit',
  CREATED_AT = 'createdAt',
}

export class GetUserRestaurantsQueryDto {
  @IsOptional()
  @IsEnum(UserRestaurantSortBy)
  sortBy: UserRestaurantSortBy = UserRestaurantSortBy.LAST_VISIT;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
