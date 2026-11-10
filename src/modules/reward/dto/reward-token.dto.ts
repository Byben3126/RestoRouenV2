import { Exclude, Expose } from 'class-transformer';

/** Token signé par le serveur, présenté (QR code) au restaurant pour récupérer la récompense */
@Exclude()
export class RewardTokenDto {
  @Expose() token!: string;
  @Expose() expiresAt!: Date;
}
