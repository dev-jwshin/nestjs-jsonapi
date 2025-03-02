import { SetMetadata } from '@nestjs/common';

export const JSONAPI_ALLOWED_FILTERS = 'jsonapi_allowed_filters';

/**
 * 컨트롤러 또는 메서드에서 허용된 필터 필드를 설정하는 데코레이터
 * @param filters 허용된 필터 필드 목록
 */
export const AllowedFilters = (filters: string[]) => {
  return SetMetadata(JSONAPI_ALLOWED_FILTERS, filters);
}; 