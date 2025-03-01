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
  filters: QueryFilter[];
  sorts: QuerySort[];
  pagination: QueryPagination;
} {
  const filters: QueryFilter[] = [];
  const sorts: QuerySort[] = [];
  const pagination: QueryPagination = {};

  // 필터링 파라미터 처리
  if (options.filter) {
    Object.entries(options.filter).forEach(([field, value]) => {
      if (typeof value !== 'object') {
        // 단순 필터 (필드=값)
        filters.push({
          field,
          operator: 'eq',
          value,
        });
      } else {
        // 연산자 기반 필터
        Object.entries(value).forEach(([operator, operandValue]) => {
          filters.push({
            field,
            operator: operator as any,
            value: operandValue,
          });
        });
      }
    });
  }

  // 정렬 파라미터 처리
  if (options.sort) {
    options.sort.forEach((sort) => {
      sorts.push({
        field: sort.field,
        direction: sort.direction,
      });
    });
  }

  // 페이지네이션 파라미터 처리
  if (options.pagination) {
    // 오프셋 기반 페이지네이션
    if (options.pagination.number !== undefined && options.pagination.size !== undefined) {
      pagination.page = options.pagination.number;
      pagination.perPage = options.pagination.size;
    }
    // 커서 기반 페이지네이션
    else if (options.pagination.after || options.pagination.before) {
      pagination.cursorField = 'id'; // 기본값으로 id 사용
      
      if (options.pagination.after) {
        const [type, id] = options.pagination.after.split(':');
        pagination.afterCursor = id;
      }
      
      if (options.pagination.before) {
        const [type, id] = options.pagination.before.split(':');
        pagination.beforeCursor = id;
      }
    }
  }

  return { filters, sorts, pagination };
} 