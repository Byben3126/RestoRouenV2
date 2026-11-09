import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T> | StreamableFile> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T> | StreamableFile> {
    return next.handle().pipe(
      // Un fichier (ex. pass Apple Wallet) est envoyé tel quel, sans enveloppe JSON
      map((data: T) =>
        data instanceof StreamableFile
          ? data
          : { success: true, data, timestamp: new Date().toISOString() },
      ),
    );
  }
}
