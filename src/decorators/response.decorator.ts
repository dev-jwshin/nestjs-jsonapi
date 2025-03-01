import { SetMetadata, Type } from '@nestjs/common';

export const JSONAPI_RESPONSE_SERIALIZER = 'jsonapi_response_serializer';

export interface JSONAPIResponseOptions {
  serializer: Type<any>;
}

export const JSONAPIResponse = (options: JSONAPIResponseOptions) => {
  return SetMetadata(JSONAPI_RESPONSE_SERIALIZER, options);
}; 