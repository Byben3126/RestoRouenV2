import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class RatingDto {
  @Expose() id!: string;
  @Expose() globalRating!: number;
  @Expose() createdAt!: Date;
}
