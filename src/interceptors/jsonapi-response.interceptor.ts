import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Type, Inject, Optional } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SerializerService } from '../services/serializer.service';
import { JSONAPI_RESPONSE_SERIALIZER } from '../decorators/response.decorator';
import { SerializerOptions } from '../interfaces/serializer.interface';

@Injectable()
export class JSONAPIResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly serializerService: SerializerService,
    @Optional() @Inject('JSONAPI_MODULE_OPTIONS') private readonly moduleOptions?: any,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // 응답이 이미 처리되었거나, 없는 경우, 또는 204 No Content 응답인 경우
        if (!data || data.data !== undefined || context.switchToHttp().getResponse().statusCode === 204) {
          return data;
        }

        // 컨트롤러 메서드에서 메타데이터 가져오기
        const methodOptions = this.reflector.get(
          JSONAPI_RESPONSE_SERIALIZER,
          context.getHandler(),
        );

        // 컨트롤러 클래스에서 메타데이터 가져오기 (메서드에 없는 경우)
        const classOptions = this.reflector.get(
          JSONAPI_RESPONSE_SERIALIZER,
          context.getClass(),
        );

        const responseOptions = methodOptions || classOptions;

        // 직렬화기가 지정되지 않은 경우
        if (!responseOptions || !responseOptions.serializer) {
          return data;
        }

        // 페이지네이션 옵션 처리
        const serializerOptions: SerializerOptions = {};
        
        // 페이지네이션 설정 적용 (우선 순위: 메서드 옵션 > 클래스 옵션 > 모듈 옵션 > 기본값)
        const paginationEnabled = 
          (responseOptions.pagination?.enabled !== undefined) ? 
            responseOptions.pagination.enabled : 
            (this.moduleOptions?.pagination?.enabled !== undefined ? 
              this.moduleOptions.pagination.enabled : 
              true);
              
        if (paginationEnabled) {
          // 현재 요청에 페이지네이션 파라미터가 없는 경우에만 기본 크기 설정
          const requestHasPagination = 
            this.requestHasPaginationParams(context);
            
          if (!requestHasPagination) {
            const defaultSize = 
              responseOptions.pagination?.size || 
              this.moduleOptions?.pagination?.size || 
              10;
            
            serializerOptions.pagination = {
              number: 1,
              size: defaultSize,
              count: true
            };
          }
        }

        // 응답 직렬화
        return this.serializerService.serialize(
          responseOptions.serializer,
          data,
          serializerOptions
        );
      }),
    );
  }
  
  private requestHasPaginationParams(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const query = request.query || {};
    
    // page[number], page[size], page[after], page[before] 파라미터가 있는지 확인
    return (
      query.page?.number !== undefined || 
      query.page?.size !== undefined ||
      query.page?.after !== undefined ||
      query.page?.before !== undefined
    );
  }
} 