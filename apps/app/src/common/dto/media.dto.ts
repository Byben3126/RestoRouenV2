import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class MediaDto {
  @Expose() id!: string;
  @Expose() mimeType?: string;
  @Expose() size?: number;

  @Expose()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  @Transform(({ obj }) => `https://${process.env.CLOUDFRONT_DOMAIN}/${obj.key}`)
  url!: string;
}
