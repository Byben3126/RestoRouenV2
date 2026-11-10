import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetPointsTransactionsQueryDto {
  /** nextCursor de la page précédente ; absent pour la première page */
  @IsOptional()
  @IsString()
  after?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 20;
}
