import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class MediaDto {
  @Expose() id!: string;
  @Expose() mimeType?: string;
  @Expose() size?: number;

  @Expose()
  @Transform(({ obj }) => `https://${process.env.CLOUDFRONT_DOMAIN}/${obj.key}`)
  url!: string;
}
