import { IsJWT } from 'class-validator';

export class UseRewardDto {
  /** Token signé obtenu par le client via GET /users/me/rewards/:id/token */
  @IsJWT()
  token!: string;
}
