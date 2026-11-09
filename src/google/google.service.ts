import { HttpException, Injectable } from '@nestjs/common';

import axios, { AxiosError } from 'axios';

@Injectable()
export class GoogleService {
  private readonly googleClient = axios.create({
    baseURL: 'https://places.googleapis.com/v1/',
    headers: { 'X-Goog-Api-Key': process.env.GOOGLE_API_KEY },
    timeout: 5_000,
  });

  constructor() {
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
}
