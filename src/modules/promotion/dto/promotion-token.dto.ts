import { Exclude, Expose } from 'class-transformer';

/** Token signé par le serveur, présenté (QR code) au restaurant pour utiliser la promotion */
@Exclude()
export class PromotionTokenDto {
  @Expose() token!: string;
  @Expose() expiresAt!: Date;
}
