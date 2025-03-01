import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { FactoryProvider } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { SerializerService } from '../services/serializer.service';
import { buildQueryParams } from '../interfaces/query-builder.interface';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';

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
      // 기본 Repository 생성
      const baseRepository = dataSource.getRepository<T>(entity);
      
      // 프록시 객체 생성
      return new Proxy(baseRepository, {
        // 메서드 호출 가로채기
        get(target: Repository<T>, prop: string | symbol, receiver: any) {
          // 원래 속성/메서드 가져오기
          const originalValue = Reflect.get(target, prop, receiver);
          
          // 가로챌 메서드인지 확인
          if (prop === 'find' && typeof originalValue === 'function') {
            // find 메서드 래핑
            return async function(...args: any[]) {
              // JSON:API 쿼리 파라미터 가져오기
              const serializerOptions = serializerService.getAutoOptions();
              
              // 허용된 필터와 인클루드로 옵션 필터링
              const filteredOptions = filterSerializerOptions(serializerOptions, options);
              
              const { filters, sorts, pagination } = buildQueryParams(filteredOptions);
              
              // 기본 옵션 (인자가 있으면 첫 번째 인자 사용)
              const queryOptions = args.length > 0 ? { ...args[0] } : {};
              
              // 필터 적용
              if (filters.length > 0) {
                queryOptions.where = queryOptions.where || {};
                
                // 단순 필터만 지원 (eq 연산자)
                filters.forEach(filter => {
                  if (filter.operator === 'eq') {
                    if (typeof queryOptions.where === 'object' && !Array.isArray(queryOptions.where)) {
                      queryOptions.where[filter.field] = filter.value;
                    }
                  }
                });
              }
              
              // 정렬 적용
              if (sorts.length > 0) {
                queryOptions.order = queryOptions.order || {};
                
                sorts.forEach(sort => {
                  queryOptions.order[sort.field] = sort.direction.toUpperCase();
                });
              }
              
              // 페이지네이션 적용 (오프셋 기반)
              if (pagination.page !== undefined && pagination.perPage !== undefined) {
                queryOptions.skip = (pagination.page - 1) * pagination.perPage;
                queryOptions.take = pagination.perPage;
              }
              
              // 원래 메서드 호출 (수정된 옵션으로)
              return originalValue.apply(target, queryOptions ? [queryOptions] : args);
            };
          } 
          // findAndCount 메서드도 동일하게 처리
          else if (prop === 'findAndCount' && typeof originalValue === 'function') {
            return async function(...args: any[]) {
              // JSON:API 쿼리 파라미터 가져오기
              const serializerOptions = serializerService.getAutoOptions();
              
              // 허용된 필터와 인클루드로 옵션 필터링
              const filteredOptions = filterSerializerOptions(serializerOptions, options);
              
              const { filters, sorts, pagination } = buildQueryParams(filteredOptions);
              
              const queryOptions = args.length > 0 ? { ...args[0] } : {};
              
              // 필터 적용
              if (filters.length > 0) {
                queryOptions.where = queryOptions.where || {};
                
                filters.forEach(filter => {
                  if (filter.operator === 'eq') {
                    if (typeof queryOptions.where === 'object' && !Array.isArray(queryOptions.where)) {
                      queryOptions.where[filter.field] = filter.value;
                    }
                  }
                });
              }
              
              // 정렬 적용
              if (sorts.length > 0) {
                queryOptions.order = queryOptions.order || {};
                
                sorts.forEach(sort => {
                  queryOptions.order[sort.field] = sort.direction.toUpperCase();
                });
              }
              
              // 페이지네이션 적용 (오프셋 기반)
              if (pagination.page !== undefined && pagination.perPage !== undefined) {
                queryOptions.skip = (pagination.page - 1) * pagination.perPage;
                queryOptions.take = pagination.perPage;
              }
              
              return originalValue.apply(target, queryOptions ? [queryOptions] : args);
            };
          }
          
          // 나머지 메서드는 그대로 사용
          return originalValue;
        }
      });
    }
  };
}

/**
 * SerializerOptions에서 허용된 필터와 인클루드만 추출
 * @param options 원본 SerializerOptions
 * @param repositoryOptions Repository 옵션
 * @returns 필터링된 SerializerOptions
 */
function filterSerializerOptions(options: any, repositoryOptions: JsonApiRepositoryOptions): any {
  // 원본 옵션 복사
  const filteredOptions = { ...options };
  
  // 허용된 필터가 지정된 경우
  if (repositoryOptions.allowedFilters && filteredOptions.filter) {
    const allowedFilters = repositoryOptions.allowedFilters;
    const originalFilter = filteredOptions.filter;
    const filteredFilter = {};
    
    // 허용된 필터 필드만 유지
    Object.keys(originalFilter).forEach(key => {
      if (allowedFilters.includes(key)) {
        filteredFilter[key] = originalFilter[key];
      }
    });
    
    filteredOptions.filter = filteredFilter;
  }
  
  // 허용된 인클루드가 지정된 경우
  if (repositoryOptions.allowedIncludes && filteredOptions.include) {
    const allowedIncludes = repositoryOptions.allowedIncludes;
    const originalIncludes = Array.isArray(filteredOptions.include) 
      ? filteredOptions.include 
      : filteredOptions.include.split(',');
    
    // 허용된 인클루드 경로만 유지
    const filteredIncludes = originalIncludes.filter(include => {
      // 중첩 관계(예: 'user.posts')의 경우 기본 관계('user')가 허용 목록에 있는지 확인
      const basePath = include.split('.')[0];
      return allowedIncludes.some(allowed => 
        allowed === include || // 정확히 일치하거나
        allowed.startsWith(include + '.') || // 이 include가 허용된 더 깊은 경로의 시작이거나
        include.startsWith(allowed + '.') || // 허용된 경로가 이 include의 시작이거나
        allowed === basePath // 기본 경로가 허용되었거나
      );
    });
    
    filteredOptions.include = filteredIncludes.join(',');
  }
  
  return filteredOptions;
} 