import { SerializerOptions } from './serializer.interface';

/**
 * 쿼리 필터 조건 타입
 */
export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like';
  value: any;
}

/**
 * 쿼리 정렬 조건 타입
 */
export interface QuerySort {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * 쿼리 페이지네이션 설정
 */
export interface QueryPagination {
  // 오프셋 기반 페이지네이션
  page?: number;
  perPage?: number;
  
  // 커서 기반 페이지네이션
  cursorField?: string;
  afterCursor?: string;
  beforeCursor?: string;
}

/**
 * 쿼리 빌더 인터페이스
 * 여러 ORM/데이터베이스에 대한 공통 인터페이스를 제공합니다.
 */
export interface QueryBuilderInterface {
  /**
   * 필터 조건 적용
   * @param filter 필터 조건
   */
  applyFilter(filter: QueryFilter): this;

  /**
   * 여러 필터 조건 적용
   * @param filters 필터 조건 배열
   */
  applyFilters(filters: QueryFilter[]): this;

  /**
   * 정렬 적용
   * @param sorts 정렬 조건 배열
   */
  applySorting(sorts: QuerySort[]): this;

  /**
   * 페이지네이션 적용
   * @param pagination 페이지네이션 설정
   */
  applyPagination(pagination: QueryPagination): this;

  /**
   * 쿼리 실행 및 결과 반환
   */
  execute<T>(): Promise<T[]>;
  
  /**
   * 총 개수 조회
   */
  count(): Promise<number>;
}

/**
 * SerializerOptions에서 쿼리 빌더 매개변수 추출
 */
export function buildQueryParams(options: SerializerOptions): {
  filters: Array<{ field: string; operator: string; value: any }>;
  sorts: Array<{ field: string; direction: string }>;
  pagination: { page?: number; perPage?: number };
} {
  const result = {
    filters: [],
    sorts: [],
    pagination: {}
  };

  // 필터 처리
  if (options.filter && Object.keys(options.filter).length > 0) {
    Object.entries(options.filter).forEach(([field, value]) => {
      // 단순 값 (filter[name]=value)
      if (typeof value !== 'object') {
        result.filters.push({
          field,
          operator: 'eq',
          value
        });
      } 
      // 연산자가 있는 필터 (filter[name][eq]=value)
      else {
        Object.entries(value).forEach(([operator, operand]) => {
          result.filters.push({
            field,
            operator,
            value: operand
          });
        });
      }
    });
  }

  // 정렬 처리
  if (options.sort && options.sort.length > 0) {
    result.sorts = options.sort.map(sort => ({
      field: sort.field,
      direction: sort.direction
    }));
  }

  // 페이지네이션 처리
  if (options.pagination) {
    if (options.pagination.number !== undefined && options.pagination.size !== undefined) {
      result.pagination = {
        page: options.pagination.number,
        perPage: options.pagination.size
      };
    }
  }

  return result;
} 