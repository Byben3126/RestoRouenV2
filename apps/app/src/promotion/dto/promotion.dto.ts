import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose, Transform, plainToInstance } from 'class-transformer';

import { CustomerDto } from '../../customer/dto/customer.dto';
import { PromotionAudience, PromotionStatus } from '../entities/promotion.entity';

@Exclude()
export class PromotionDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() audience!: PromotionAudience;
  @Expose() status!: PromotionStatus;
  @Expose() scheduledAt!: Date;
  @Expose() expiresAt!: Date;
  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;
  @Expose() usedCount!: number;
  @Expose() targetCount!: number;

  @ApiProperty({ type: () => CustomerDto, isArray: true })
  @Expose()
  @Transform(({ obj }) =>
    plainToInstance(
      CustomerDto,
      obj.targetedCustomers.getItems(false).map((pt: any) => pt.customer),
    ),
  )
  targetedCustomers!: CustomerDto[];
}
