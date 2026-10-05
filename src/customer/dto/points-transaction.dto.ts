import { Exclude, Expose } from 'class-transformer';

import { PointsTransactionType } from '../entities/points-transaction.entity';

@Exclude()
export class PointsTransactionDto {
  @Expose() id!: string;
  @Expose() amount!: number;
  @Expose() type!: PointsTransactionType;
  @Expose() reason?: string;
  @Expose() createdAt!: Date;
}
