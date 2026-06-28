import { Exclude, Expose, Transform, plainToInstance } from 'class-transformer';

import { MediaDto } from '../../common/dto/media.dto';
import { RewardStatus } from '../entities/reward.entity';

export { MediaDto };

@Exclude()
export class RewardDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() description?: string;
  @Expose() pointRequired!: number;
  @Expose() status!: RewardStatus;
  @Expose() usedCount!: number;
  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;

  @Expose()
  @Transform(({ obj }) =>
    plainToInstance(MediaDto, obj.medias.getItems(false), { excludeExtraneousValues: true }),
  )
  medias!: MediaDto[];
}
