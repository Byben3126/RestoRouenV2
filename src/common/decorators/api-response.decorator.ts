import { Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiResponseCommonMetadata,
} from '@nestjs/swagger';

type ApiResponseOptions = Omit<ApiResponseCommonMetadata, 'status' | 'type'> & {
  type: Type<unknown> | [Type<unknown>];
};

/** Enveloppe de TransformInterceptor autour du DTO */
function Wrapped(type: Type<unknown> | [Type<unknown>], isArray = false) {
  const dto = Array.isArray(type) ? type[0] : type;
  const list = isArray || Array.isArray(type);

  class WrappedResponse {
    @ApiProperty({ example: true })
    success!: boolean;

    @ApiProperty({ type: dto, isArray: list })
    data!: unknown;

    @ApiProperty({ format: 'date-time' })
    timestamp!: string;
  }
  Object.defineProperty(WrappedResponse, 'name', {
    value: `${dto.name}${list ? 'List' : ''}Response`,
  });
  return WrappedResponse;
}

export const ApiOkWrappedResponse = ({ type, isArray, ...options }: ApiResponseOptions) =>
  ApiOkResponse({ ...options, type: Wrapped(type, isArray) });

export const ApiCreatedWrappedResponse = ({ type, isArray, ...options }: ApiResponseOptions) =>
  ApiCreatedResponse({ ...options, type: Wrapped(type, isArray) });
