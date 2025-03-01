import { Injectable, Type, NotFoundException, BadRequestException } from '@nestjs/common';
import 'reflect-metadata';
import { RequestContextService } from './request-context.service';
import { AttributeProcessor } from './attribute-processor.service';
import { RelationshipProcessor } from './relationship-processor.service';
import { IncludeProcessor } from './include-processor.service';
import { SerializerRegistry } from './serializer-registry.service';
import { SerializerOptions, ResourceObject, PaginationMeta, PaginationLinks } from '../interfaces/serializer.interface';

@Injectable()
export class SerializerService {
  constructor(
    private readonly requestContextService: RequestContextService,
    private readonly attributeProcessor: AttributeProcessor,
    private readonly relationshipProcessor: RelationshipProcessor,
    private readonly includeProcessor: IncludeProcessor,
    private readonly serializerRegistry: SerializerRegistry
  ) {}

  // 자동으로 옵션을 가져오는 메서드
  getAutoOptions(): SerializerOptions {
    const req = this.requestContextService.get();
    if (!req) return {};

    const options: SerializerOptions = {};
    
    // include 파라미터 처리
    if (req.query.include) {
      const includeStr = req.query.include as string;
      options.include = includeStr.split(',').map(i => i.trim());
    }
    
    // fields 파라미터 처리
    options.fields = {};
    Object.keys(req.query).forEach(key => {
      if (key.startsWith('fields[') && key.endsWith(']')) {
        const resourceType = key.slice(7, -1);
        const fieldsStr = req.query[key] as string;
        options.fields[resourceType] = fieldsStr.split(',').map(f => f.trim());
      }
    });
    
    // 페이지네이션 파라미터 처리
    const pageParams = this.extractObjectParams(req.query, 'page');
    if (Object.keys(pageParams).length > 0) {
      options.pagination = {
        number: pageParams.number ? parseInt(pageParams.number as string, 10) : undefined,
        size: pageParams.size ? parseInt(pageParams.size as string, 10) : undefined,
        after: pageParams.after as string,
        before: pageParams.before as string,
        count: pageParams.count ? pageParams.count === 'true' : true
      };
    }
    
    // 정렬 파라미터 처리
    if (req.query.sort) {
      const sortStr = req.query.sort as string;
      options.sort = sortStr.split(',').map(s => {
        const field = s.trim();
        if (field.startsWith('-')) {
          return { field: field.substring(1), direction: 'desc' as const };
        }
        return { field, direction: 'asc' as const };
      });
    }
    
    // 필터 파라미터 처리
    const filterParams = this.extractObjectParams(req.query, 'filter');
    if (Object.keys(filterParams).length > 0) {
      options.filter = filterParams;
    }
    
    return options;
  }
  
  // 중첩된 쿼리 파라미터 추출 헬퍼 메서드 (filter[name]=value, filter[date][gte]=value 등)
  private extractObjectParams(query: Record<string, any>, prefix: string): Record<string, any> {
    const result: Record<string, any> = {};
    
    Object.keys(query).forEach(key => {
      // 단순 파라미터 (filter[name]=value)
      if (key.startsWith(`${prefix}[`) && key.endsWith(']')) {
        const paramName = key.slice(prefix.length + 1, -1);
        result[paramName] = query[key];
      }
      
      // 중첩 파라미터 (filter[date][gte]=value)
      const nestedMatch = key.match(new RegExp(`^${prefix}\\[([^\\]]+)\\]\\[([^\\]]+)\\]$`));
      if (nestedMatch) {
        const [, paramName, nestedKey] = nestedMatch;
        if (!result[paramName]) {
          result[paramName] = {};
        }
        result[paramName][nestedKey] = query[key];
      }
    });
    
    return result;
  }

  /**
   * JSON:API 형식으로 데이터를 직렬화합니다.
   * @param serializer 직렬화기 클래스
   * @param data 직렬화할 데이터 (단일 객체 또는 배열)
   * @param options 직렬화 옵션 (없으면 자동으로 추출)
   */
  serialize(serializer: Type<any>, data: any | any[], options?: SerializerOptions) {
    try {
      // 직렬화기 레지스트리에 등록
      this.serializerRegistry.registerByClassName(serializer);
      
      // 옵션이 제공되지 않았으면 자동으로 가져옴
      const finalOptions = options || this.getAutoOptions();
      
      const isCollection = Array.isArray(data);
      
      if (data === undefined || data === null) {
        return { data: isCollection ? [] : null };
      }
      
      // 페이지네이션, 정렬, 필터링 적용
      let processedData = data;
      let meta: Record<string, any> = {};
      let links: Record<string, any> = {};
      
      if (isCollection) {
        // 필터링 적용
        if (finalOptions.filter && Object.keys(finalOptions.filter).length > 0) {
          processedData = this.applyFiltering(processedData as any[], finalOptions.filter);
        }
        
        // 정렬 적용
        if (finalOptions.sort && finalOptions.sort.length > 0) {
          processedData = this.applySorting(processedData as any[], finalOptions.sort);
        }
        
        // 페이지네이션 적용
        if (finalOptions.pagination) {
          const paginationResult = this.applyPagination(
            processedData as any[], 
            finalOptions.pagination
          );
          processedData = paginationResult.data;
          meta = { ...meta, ...paginationResult.meta };
          links = { ...links, ...paginationResult.links };
        }
      }
      
      const result: { 
        data: any, 
        included?: any[],
        meta?: Record<string, any>,
        links?: Record<string, any>
      } = {
        data: isCollection 
          ? (processedData as any[]).map(item => this.serializeItem(serializer, item, finalOptions))
          : this.serializeItem(serializer, processedData, finalOptions)
      };
      
      // 관계 포함
      if (finalOptions.include?.length) {
        result.included = this.includeProcessor.processIncluded(
          serializer, 
          processedData, 
          finalOptions,
          (s, i, o) => this.serializeItem(s, i, o)
        );
      }
      
      // 메타데이터 추가
      if (Object.keys(meta).length > 0) {
        result.meta = meta;
      }
      
      // 링크 추가
      if (Object.keys(links).length > 0) {
        result.links = links;
      }
      
      return result;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(`Serialization failed: ${error.message}`);
    }
  }
  
  serializeItem(serializer: Type<any>, item: any, options: SerializerOptions): ResourceObject | null {
    if (item === undefined || item === null) return null;
    
    try {
      const serializerOptions = Reflect.getMetadata('jsonapi_serializer_options', serializer);
      
      if (!serializerOptions) {
        throw new NotFoundException(`Serializer metadata not found for ${serializer.name}`);
      }
      
      // Get ID
      let id: string;
      try {
        if (typeof serializerOptions.id === 'function') {
          id = serializerOptions.id(item, options.params);
        } else {
          id = item[serializerOptions.id] ? item[serializerOptions.id].toString() : null;
        }
        
        if (!id) {
          throw new BadRequestException(`Failed to get ID for the resource`);
        }
      } catch (idError) {
        throw new BadRequestException(`ID generation failed: ${idError.message}`);
      }
      
      // Build response object
      const result: ResourceObject = {
        id,
        type: serializerOptions.type,
        attributes: this.attributeProcessor.getAttributes(serializer, item, options),
      };
      
      // Add relationships if they exist
      const serializedRelationships = this.relationshipProcessor.getRelationships(serializer, item, options);
      if (Object.keys(serializedRelationships).length > 0) {
        result.relationships = serializedRelationships;
      }
      
      return result;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(`Item serialization failed: ${error.message}`);
    }
  }
  
  // 필터링 적용
  private applyFiltering(data: any[], filters: Record<string, any>): any[] {
    return data.filter(item => {
      // 모든 필터 조건을 검사
      return Object.entries(filters).every(([key, value]) => {
        // 단순 필터 (filter[name]=value)
        if (typeof value !== 'object') {
          return item[key] === value;
        }
        
        // 중첩 필터 (filter[date][gte]=value)
        return Object.entries(value).every(([operator, operand]) => {
          switch (operator) {
            case 'eq': return item[key] === operand;
            case 'ne': return item[key] !== operand;
            case 'gt': return item[key] > operand;
            case 'gte': return item[key] >= operand;
            case 'lt': return item[key] < operand;
            case 'lte': return item[key] <= operand;
            case 'in': return Array.isArray(operand) ? 
              operand.includes(item[key]) : 
              String(operand).split(',').includes(String(item[key]));
            case 'nin': return Array.isArray(operand) ? 
              !operand.includes(item[key]) : 
              !String(operand).split(',').includes(String(item[key]));
            case 'like': return typeof item[key] === 'string' && 
              item[key].includes(String(operand));
            default: return true;
          }
        });
      });
    });
  }
  
  // 정렬 적용
  private applySorting(data: any[], sort: Array<{ field: string, direction: 'asc' | 'desc' }>): any[] {
    return [...data].sort((a, b) => {
      for (const { field, direction } of sort) {
        if (a[field] < b[field]) return direction === 'asc' ? -1 : 1;
        if (a[field] > b[field]) return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }
  
  // 페이지네이션 적용
  private applyPagination(
    data: any[], 
    pagination: SerializerOptions['pagination']
  ): { 
    data: any[], 
    meta: PaginationMeta, 
    links: PaginationLinks 
  } {
    const result: { 
      data: any[], 
      meta: PaginationMeta, 
      links: PaginationLinks 
    } = {
      data: [...data],
      meta: {},
      links: { self: this.getCurrentUrl() }
    };
    
    const totalCount = data.length;
    
    // 오프셋 기반 페이지네이션
    if (pagination.number !== undefined && pagination.size !== undefined) {
      const page = pagination.number;
      const size = pagination.size;
      const startIndex = (page - 1) * size;
      const endIndex = page * size;
      
      result.data = data.slice(startIndex, endIndex);
      
      if (pagination.count) {
        result.meta = {
          current_page: page,
          from: startIndex + 1,
          last_page: Math.ceil(totalCount / size),
          per_page: size,
          to: Math.min(endIndex, totalCount),
          total: totalCount,
        };
      }
      
      // 링크 생성
      const baseUrl = this.getBaseUrl();
      const currentQuery = this.getCurrentQuery();
      
      const createPageLink = (pageNum: number) => {
        const newQuery = { ...currentQuery, 'page[number]': pageNum.toString() };
        return `${baseUrl}?${this.buildQueryString(newQuery)}`;
      };
      
      const lastPage = Math.ceil(totalCount / size);
      
      result.links = {
        self: this.getCurrentUrl(),
        first: createPageLink(1),
        last: createPageLink(lastPage),
      };
      
      if (page > 1) {
        result.links.prev = createPageLink(page - 1);
      }
      
      if (page < lastPage) {
        result.links.next = createPageLink(page + 1);
      }
    }
    
    // 커서 기반 페이지네이션
    else if (pagination.after || pagination.before) {
      const size = pagination.size || 10;
      let startIndex = 0;
      
      if (pagination.after) {
        const afterId = pagination.after.split(':')[1]; // "article:123" => "123"
        const afterIndex = data.findIndex(item => item.id.toString() === afterId);
        if (afterIndex !== -1) {
          startIndex = afterIndex + 1;
        }
      }
      
      result.data = data.slice(startIndex, startIndex + size);
      
      if (pagination.count) {
        result.meta = {
          per_page: size,
          count: result.data.length,
          total: totalCount,
        };
      }
      
      // 링크 생성
      if (result.data.length > 0) {
        const baseUrl = this.getBaseUrl();
        const currentQuery = this.getCurrentQuery();
        
        // 자원 타입 추출 (첫 번째 항목에서)
        const resourceType = result.data[0].type || 'resource';
        
        if (startIndex + size < totalCount) {
          const lastItem = result.data[result.data.length - 1];
          const newQuery = { 
            ...currentQuery, 
            'page[after]': `${resourceType}:${lastItem.id}`,
            'page[size]': size.toString()
          };
          result.links.next = `${baseUrl}?${this.buildQueryString(newQuery)}`;
        }
        
        if (startIndex > 0) {
          const firstItem = data[Math.max(0, startIndex - size)];
          const newQuery = { 
            ...currentQuery, 
            'page[before]': `${resourceType}:${firstItem.id}`,
            'page[size]': size.toString()
          };
          result.links.prev = `${baseUrl}?${this.buildQueryString(newQuery)}`;
        }
      }
    }
    
    return result;
  }
  
  // 현재 URL 가져오기
  private getCurrentUrl(): string {
    const req = this.requestContextService.get();
    if (!req) return '';
    
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost';
    const originalUrl = req.originalUrl || req.url || '/';
    
    return `${protocol}://${host}${originalUrl}`;
  }
  
  // 기본 URL 가져오기 (쿼리 스트링 없이)
  private getBaseUrl(): string {
    const req = this.requestContextService.get();
    if (!req) return '';
    
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost';
    const path = req.path || '/';
    
    return `${protocol}://${host}${path}`;
  }
  
  // 현재 쿼리 파라미터 가져오기
  private getCurrentQuery(): Record<string, string> {
    const req = this.requestContextService.get();
    if (!req || !req.query) return {};
    
    const result: Record<string, string> = {};
    
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        result[key] = req.query[key] as string;
      }
    }
    
    return result;
  }
  
  // 쿼리 스트링 생성
  private buildQueryString(params: Record<string, string>): string {
    return Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }
} 