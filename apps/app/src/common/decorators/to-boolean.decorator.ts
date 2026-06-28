import { applyDecorators } from '@nestjs/common';

import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export function ToBoolean() {
  return applyDecorators(
    IsBoolean(),
    Transform(({ value }) => {
      if (value === true || value === 'true' || value === '1') return true;
      if (value === false || value === 'false' || value === '0') return false;
      return value;
    }),
  );
}
