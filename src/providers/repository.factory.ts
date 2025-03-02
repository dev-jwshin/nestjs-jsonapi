import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { FactoryProvider } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { SerializerService } from '../services/serializer.service';
import { buildQueryParams } from '../interfaces/query-builder.interface';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { Like, MoreThan, MoreThanOrEqual, LessThan, LessThanOrEqual, Not } from 'typeorm';
import { RequestContextService } from '../services/request-context.service';
import * as fs from 'fs';
import * as path from 'path';

// 로그 파일 경로
const logFilePath = path.resolve(process.cwd(), 'debug.log');

// 파일에 로그 기록
function logToFile(message: string): void {
  try {
    fs.appendFileSync(logFilePath, `${new Date().toISOString()} - ${message}\n`);
  } catch (err) {
    // 파일 로깅 실패 시 조용히 넘어갑니다
  }
}

/**
 * 모든 Repository 메서드 호출을 인터셉트하여 JSON:API 쿼리 파라미터를 자동으로 적용하는 팩토리
 * @param entity TypeORM 엔티티 클래스
 * @returns JSON:API 쿼리 파라미터가 자동으로 적용되는 Repository Provider
 */
export function createJsonApiRepositoryProvider<T extends ObjectLiteral>(
  entity: EntityClassOrSchema,
): FactoryProvider {
  return {
    provide: getRepositoryToken(entity),
    inject: [getDataSourceToken(), SerializerService, RequestContextService],
    useFactory: (dataSource: DataSource, serializerService: SerializerService, requestContextService: RequestContextService) => {
      const baseRepository = dataSource.getRepository<T>(entity);
      
      // 메서드 호출을 가로챌 프록시 생성
      return new Proxy(baseRepository, {
        get(target: Repository<T>, prop: string | symbol, receiver: any) {
          const originalValue = Reflect.get(target, prop, receiver);
          
          // 인터셉트할 메서드 목록
          const methodsToWrap = [
            'find', 
            'findAndCount', 
            'findOne', 
            'count', 
            'findBy', 
            'findOneBy', 
            'findOneByOrFail', 
            'findAndCountBy', 
            'countBy',
            'createQueryBuilder'
          ];
          
          if (typeof originalValue === 'function' && methodsToWrap.includes(prop as string)) {
            return async function(...args: any[]) {
              // 디버깅: 메서드 실행 로그
              const message = `[DEBUG] Intercepting Repository method: ${String(prop)}`;
              console.log(message);
              logToFile(message);
              return wrapRepositoryMethod(originalValue, target, args, serializerService, requestContextService);
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
  requestContextService: RequestContextService
) {
  // JSON:API 쿼리 파라미터 가져오기
  const serializerOptions = serializerService.getAutoOptions();
  
  // 현재 요청 컨텍스트 가져오기
  const request = requestContextService.get();
  
  // 디버깅: 요청 컨텍스트 및 쿼리 로그
  logToFile(`[DEBUG] Request context available: ${!!request}`);
  console.log('[DEBUG] Request context available:', !!request);
  
  if (request?.query) {
    logToFile(`[DEBUG] Query parameters: ${JSON.stringify(request.query)}`);
    console.log('[DEBUG] Query parameters:', request?.query);
  }
  
  // 요청 객체에 설정된 허용된 필터 가져오기
  const allowedFilters = request && request['jsonapiAllowedFilters'];
  
  // 디버깅: 허용된 필터 로그
  logToFile(`[DEBUG] Allowed filters: ${JSON.stringify(allowedFilters)}`);
  console.log('[DEBUG] Allowed filters:', allowedFilters);
  
  if (serializerOptions.filter) {
    logToFile(`[DEBUG] Serializer options filter: ${JSON.stringify(serializerOptions.filter)}`);
    console.log('[DEBUG] Serializer options filter:', serializerOptions.filter);
  }
  
  // 필터 제한이 설정된 경우 필터 적용
  if (allowedFilters && serializerOptions.filter) {
    const filteredFilters = {};
    
    Object.keys(serializerOptions.filter).forEach(key => {
      if (allowedFilters.includes(key)) {
        filteredFilters[key] = serializerOptions.filter[key];
      } else {
        logToFile(`[DEBUG] Filtering out non-allowed filter: ${key}`);
        console.log(`[DEBUG] Filtering out non-allowed filter: ${key}`);
      }
    });
    
    // 필터링된 필터로 교체
    serializerOptions.filter = filteredFilters;
    logToFile(`[DEBUG] Filtered serializer options filter: ${JSON.stringify(serializerOptions.filter)}`);
    console.log('[DEBUG] Filtered serializer options filter:', serializerOptions.filter);
  }
  
  // 쿼리 파라미터 빌드 - 컨트롤러 레벨 필터링만 적용
  const { filters, sorts, pagination } = buildQueryParams(serializerOptions);
  
  // 디버깅: 최종 필터 로그
  logToFile(`[DEBUG] Final filters after buildQueryParams: ${JSON.stringify(filters)}`);
  console.log('[DEBUG] Final filters after buildQueryParams:', filters);
  
  // 쿼리 옵션 생성 및 적용
  const queryOptions = createQueryOptions(args, filters, sorts, pagination);
  
  // 디버깅: 최종 쿼리 옵션 로그
  logToFile(`[DEBUG] Final query options: ${JSON.stringify(queryOptions)}`);
  console.log('[DEBUG] Final query options:', JSON.stringify(queryOptions));
  
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