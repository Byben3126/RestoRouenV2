import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose, Type } from 'class-transformer';

import { PointsTransactionType } from '../entities/points-transaction.entity';

@Exclude()
export class PointsTransactionDto {
  @Expose() id!: string;
  @Expose() amount!: number;
  @Expose() type!: PointsTransactionType;
  @Expose() reason?: string;
  @Expose() createdAt!: Date;
}

@Exclude()
export class PointsTransactionPageDto {
  @ApiProperty({ type: () => PointsTransactionDto, isArray: true })
  @Expose()
  @Type(() => PointsTransactionDto)
  items!: PointsTransactionDto[];

  /** À renvoyer en `after` pour la page suivante ; null quand il n'y en a plus */
  @Expose() nextCursor!: string | null;
}
