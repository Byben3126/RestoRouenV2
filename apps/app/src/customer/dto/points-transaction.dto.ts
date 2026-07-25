import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PointsTransactionDto {
  @Expose() id!: string;
  @Expose() amount!: number;
  @Expose() reason?: string;
  @Expose() createdAt!: Date;
}
