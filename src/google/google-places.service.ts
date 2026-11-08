import { Injectable, Logger } from '@nestjs/common';

const FIND_PLACE_URL = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json';
/** Écart maximal en mètres entre les coordonnées connues et le lieu trouvé par Google */
const MAX_DISTANCE_M = 50;
const EARTH_RADIUS_M = 6371000;

export interface LatLng {
  lat: number;
  lng: number;
}

interface FindPlaceResponse {
  status: string;
  error_message?: string;
  candidates?: { place_id: string; geometry: { location: LatLng } }[];
}

/** Distance en mètres entre deux points (Haversine) */
export function distanceInMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);

  /** place_id Google du lieu `name` situé à moins de 50 m de `position`, sinon null */
  async findPlaceId(name: string, position: LatLng): Promise<string | null> {
    const key = process.env.GOOGLE_API_KEY;
    if (!key) {
      this.logger.warn('GOOGLE_API_KEY is not set, place id lookup skipped');
      return null;
    }

    const url = new URL(FIND_PLACE_URL);
    url.search = new URLSearchParams({
      input: name,
      inputtype: 'textquery',
      locationbias: `circle:${MAX_DISTANCE_M}@${position.lat},${position.lng}`,
      fields: 'place_id,geometry',
      key,
    }).toString();

    try {
      const data = (await (await fetch(url)).json()) as FindPlaceResponse;
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        this.logger.error(`Google Places: ${data.status} ${data.error_message ?? ''}`);
      }

      const candidate = data.candidates?.[0];
      if (!candidate) return null;
      return distanceInMeters(position, candidate.geometry.location) < MAX_DISTANCE_M
        ? candidate.place_id
        : null;
    } catch (error) {
      this.logger.error('Google Places request failed', error);
      return null;
    }
  }
}
