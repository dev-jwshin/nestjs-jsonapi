import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { FactoryProvider } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { SerializerService } from '../services/serializer.service';
import { buildQueryParams } from '../interfaces/query-builder.interface';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { Like, MoreThan, MoreThanOrEqual, LessThan, LessThanOrEqual, Not } from 'typeorm';

/**
 * Repository 설정 옵션 인터페이스
 */
export interface JsonApiRepositoryOptions {
  /**
   * 허용된 필터 필드 목록
   * 지정하지 않으면 모든 필터가 허용됩니다.
   */
  allowedFilters?: string[];
  
  /**
   * 허용된 인클루드 경로 목록
   * 지정하지 않으면 모든 인클루드가 허용됩니다.
   */
  allowedIncludes?: string[];
}

/**
 * 모든 Repository 메서드 호출을 인터셉트하여 JSON:API 쿼리 파라미터를 자동으로 적용하는 팩토리
 * @param entity TypeORM 엔티티 클래스
 * @param options Repository 옵션 (허용된 필터, 인클루드 등)
 * @returns JSON:API 쿼리 파라미터가 자동으로 적용되는 Repository Provider
 */
export function createJsonApiRepositoryProvider<T extends ObjectLiteral>(
  entity: EntityClassOrSchema,
  options: JsonApiRepositoryOptions = {}
): FactoryProvider {
  return {
    provide: getRepositoryToken(entity),
    inject: [getDataSourceToken(), SerializerService],
    useFactory: (dataSource: DataSource, serializerService: SerializerService) => {
      const baseRepository = dataSource.getRepository<T>(entity);
      
      // 메서드 호출을 가로챌 프록시 생성
      return new Proxy(baseRepository, {
        get(target: Repository<T>, prop: string | symbol, receiver: any) {
          const originalValue = Reflect.get(target, prop, receiver);
          
          // 인터셉트할 메서드 목록
          const methodsToWrap = ['find', 'findAndCount', 'findOne', 'count'];
          
          if (typeof originalValue === 'function' && methodsToWrap.includes(prop as string)) {
            return async function(...args: any[]) {
              return wrapRepositoryMethod(originalValue, target, args, serializerService, options);
            };
          }
          
          return originalValue;
        }
      });
    }
  };
}

/**
 * Repository 메서드를 JSON:API 쿼리 파라미터와 함께 실행
 */
async function wrapRepositoryMethod<T>(
  originalMethod: Function, 
  target: Repository<T>, 
  args: any[],
  serializerService: SerializerService,
  options: JsonApiRepositoryOptions
) {
  // JSON:API 쿼리 파라미터 가져오기
  const serializerOptions = serializerService.getAutoOptions();
  
  // 허용된 필터와 인클루드로 옵션 필터링
  const filteredOptions = filterSerializerOptions(serializerOptions, options);
  
  // 쿼리 파라미터 빌드 - 컨트롤러 레벨 필터링 적용
  const { filters, sorts, pagination } = buildQueryParams(filteredOptions);
  
  // 쿼리 옵션 생성 및 적용
  const queryOptions = createQueryOptions(args, filters, sorts, pagination);
  
  // 원래 메서드 호출
  return originalMethod.apply(target, queryOptions ? [queryOptions] : args);
}

/**
 * 쿼리 옵션 생성
 */
function createQueryOptions(
  args: any[], 
  filters: any[], 
  sorts: any[], 
  pagination: any
): any {
  const queryOptions = args.length > 0 ? { ...args[0] } : {};
  
  applyFilters(queryOptions, filters);
  applySorting(queryOptions, sorts);
  applyPagination(queryOptions, pagination);
  
  return queryOptions;
}

/**
 * 필터 적용
 */
function applyFilters(queryOptions: any, filters: any[]): void {
  if (filters.length === 0) return;
  
  queryOptions.where = queryOptions.where || {};
  
  filters.forEach(filter => {
    if (typeof queryOptions.where === 'object' && !Array.isArray(queryOptions.where)) {
      switch (filter.operator) {
        case 'eq':
          if (typeof filter.value === 'string') {
            queryOptions.where[filter.field] = Like(`%${filter.value}%`);
          } else {
            queryOptions.where[filter.field] = filter.value;
          }
          break;
        case 'like':
          queryOptions.where[filter.field] = Like(`%${filter.value}%`);
          break;
        case 'gt':
          queryOptions.where[filter.field] = MoreThan(filter.value);
          break;
        case 'gte':
          queryOptions.where[filter.field] = MoreThanOrEqual(filter.value);
          break;
        case 'lt':
          queryOptions.where[filter.field] = LessThan(filter.value);
          break;
        case 'lte':
          queryOptions.where[filter.field] = LessThanOrEqual(filter.value);
          break;
        case 'ne':
          queryOptions.where[filter.field] = Not(filter.value);
          break;
        default:
          queryOptions.where[filter.field] = filter.value;
      }
    }
  });
}

/**
 * 정렬 적용
 */
function applySorting(queryOptions: any, sorts: any[]): void {
  if (sorts.length === 0) return;
  
  queryOptions.order = queryOptions.order || {};
  
  sorts.forEach(sort => {
    queryOptions.order[sort.field] = sort.direction.toUpperCase();
  });
}

/**
 * 페이지네이션 적용
 */
function applyPagination(queryOptions: any, pagination: any): void {
  if (pagination.page === undefined || pagination.perPage === undefined) return;
  
  queryOptions.skip = (pagination.page - 1) * pagination.perPage;
  queryOptions.take = pagination.perPage;
}

/**
 * SerializerOptions에서 허용된 필터와 인클루드만 추출
 */
function filterSerializerOptions(options: any, repositoryOptions: JsonApiRepositoryOptions): any {
  const filteredOptions = { ...options };
  
  // 허용된 인클루드 필터링 유지
  if (repositoryOptions.allowedIncludes && filteredOptions.include) {
    const allowedIncludes = repositoryOptions.allowedIncludes;
    const originalIncludes = Array.isArray(filteredOptions.include) 
      ? filteredOptions.include 
      : filteredOptions.include.split(',');
    
    const filteredIncludes = originalIncludes.filter(include => {
      const basePath = include.split('.')[0];
      return allowedIncludes.some(allowed => 
        allowed === include || 
        allowed.startsWith(include + '.') || 
        include.startsWith(allowed + '.') || 
        allowed === basePath
      );
    });
    
    filteredOptions.include = filteredIncludes.join(',');
  }
  
  return filteredOptions;
} 