import { HttpException, Inject, Injectable } from '@nestjs/common';

import axios, { AxiosError } from 'axios';
import { Redis } from 'ioredis';

import { REDIS_CLIENT } from '../redis/redis.constants';

const PLACE_DETAILS_FIELDS = 'nationalPhoneNumber,regularOpeningHours,websiteUri';
const PLACE_DETAILS_CACHE_TTL_S = 24 * 60 * 60;

@Injectable()
export class GoogleService {
  private readonly googleClient = axios.create({
    baseURL: 'https://places.googleapis.com/v1/',
    headers: { 'X-Goog-Api-Key': process.env.GOOGLE_API_KEY },
    timeout: 5_000,
  });

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    this.googleClient.interceptors.response.use(undefined, (error: AxiosError) => {
      if (!error.response) throw error;
      throw new HttpException(error.response.data as object, error.response.status);
    });
  }

  async autocomplete(body: object, params: Record<string, string>): Promise<unknown> {
    const { data } = await this.googleClient.post<unknown>('places:autocomplete', body, { params });
    return data;
  }

  async getPlace(placeId: string, params: Record<string, string>): Promise<unknown> {
    const { data } = await this.googleClient.get<unknown>(`places/${placeId}`, { params });
    return data;
  }

  async getPlaceDetails(placeId: string, language: string): Promise<unknown> {
    const cacheKey = `google:place-details:${placeId}:${language}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as unknown;

    const details = await this.getPlace(placeId, {
      fields: PLACE_DETAILS_FIELDS,
      languageCode: language,
    });
    await this.redis.set(cacheKey, JSON.stringify(details), 'EX', PLACE_DETAILS_CACHE_TTL_S);
    return details;
  }
}
