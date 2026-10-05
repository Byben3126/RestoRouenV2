import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UseInterceptors,
  applyDecorators,
} from '@nestjs/common';

import { plainToInstance } from 'class-transformer';
import type { ClassConstructor } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class SerializeInterceptor<T> implements NestInterceptor {
  constructor(
    private readonly dto: ClassConstructor<T>,
    private readonly groups?: string[],
  ) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) =>
        plainToInstance(this.dto, data, {
          groups: this.groups,
          excludeExtraneousValues: true,
        }),
      ),
    );
  }
}

export function Serialize<T>(dto: ClassConstructor<T>, groups?: string[]) {
  return applyDecorators(UseInterceptors(new SerializeInterceptor(dto, groups)));
}
