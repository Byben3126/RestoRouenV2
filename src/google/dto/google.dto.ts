import { Matches } from 'class-validator';

export class PlaceIdParamDto {
  // Bloque « . » et « .. », qui feraient sortir l'URL de /places chez Google
  @Matches(/^[\w-]+$/)
  placeId!: string;
}
