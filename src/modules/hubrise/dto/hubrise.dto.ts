import { IsNotEmpty, IsString } from 'class-validator';

export class HubriseCallbackQueryDto {
  @IsString()
  @IsNotEmpty()
  code!: string;
}

/**
 * Événement envoyé par HubRise. Interface et non classe : le ValidationPipe global (forbidNonWhitelisted)
 * refuserait ses autres champs en 400, une réponse que HubRise compte comme reçue sans la renvoyer.
 */
export interface HubriseEvent {
  resource_type: string;
  event_type: string;
  order_id?: string;
}
