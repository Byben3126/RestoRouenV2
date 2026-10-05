import { ApiProperty } from '@nestjs/swagger';

import { Exclude, Expose, Transform, Type, plainToInstance } from 'class-transformer';

import { UserDto } from '../../user/dto/user.dto';

@Exclude()
export class CustomerDto {
  @Expose() id!: string;
  @Expose() points!: number;
  @Expose() totalPointsGained!: number;
  @Expose() canSubmitRating!: boolean;
  @Expose() isInactive!: boolean;
  @Expose() lastVisitDate?: Date;
  @Expose() createdAt!: Date;
  @Expose() updatedAt!: Date;

  @Type(() => UserDto)
  @Expose()
  @Transform(({ obj }) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    plainToInstance(UserDto, { ...obj.user, ...obj.user?.authUser, ...obj.user?.person }),
  )
  user!: UserDto;
}

@Exclude()
export class PaginatedCustomersDto {
  @ApiProperty({ type: () => CustomerDto, isArray: true })
  @Type(() => CustomerDto)
  @Expose()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  @Transform(({ obj }) => plainToInstance(CustomerDto, obj.items))
  items!: CustomerDto[];

  @Expose() total!: number;
  @Expose() page!: number;
  @Expose() limit!: number;
}
