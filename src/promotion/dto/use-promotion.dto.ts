import { IsJWT } from 'class-validator';

export class UsePromotionDto {
  /** Token signé obtenu par le client via GET /users/me/promotions/:id/token */
  @IsJWT()
  token!: string;
}
