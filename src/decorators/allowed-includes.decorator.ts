import { SetMetadata } from '@nestjs/common';

export const JSONAPI_ALLOWED_INCLUDES = 'jsonapi_allowed_includes';

/**
 * 컨트롤러 또는 메서드에서 허용된 인클루드 경로를 설정하는 데코레이터
 * @param includes 허용된 인클루드 경로 목록
 */
export const AllowedIncludes = (includes: string[]) => {
  return SetMetadata(JSONAPI_ALLOWED_INCLUDES, includes);
}; 