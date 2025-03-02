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
      map(data => this.processResponse(context, data))
    );
  }

  /**
   * 응답 데이터 처리
   */
  private processResponse(context: ExecutionContext, data: any): any {
    // 이미 처리된 응답이거나 처리가 필요 없는 경우 그대로 반환
    if (this.shouldSkipProcessing(context, data)) {
      return data;
    }

    // 직렬화 옵션 가져오기
    const responseOptions = this.getSerializerOptions(context);

    // 직렬화기가 지정되지 않은 경우 원본 데이터 반환
    if (!responseOptions || !responseOptions.serializer) {
      return data;
    }

    // 페이지네이션 옵션 설정
    const serializerOptions = this.buildSerializerOptions(context, responseOptions);

    // 응답 직렬화
    return this.serializerService.serialize(
      responseOptions.serializer,
      data,
      serializerOptions
    );
  }

  /**
   * 응답 처리를 건너뛰어야 하는지 확인
   */
  private shouldSkipProcessing(context: ExecutionContext, data: any): boolean {
    return (
      !data || 
      data.data !== undefined || 
      context.switchToHttp().getResponse().statusCode === 204
    );
  }

  /**
   * 컨트롤러 메서드/클래스에서 직렬화 옵션 가져오기
   */
  private getSerializerOptions(context: ExecutionContext): any {
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

    return methodOptions || classOptions;
  }

  /**
   * 직렬화 옵션 빌드 (주로 페이지네이션 관련)
   */
  private buildSerializerOptions(context: ExecutionContext, responseOptions: any): SerializerOptions {
    const serializerOptions: SerializerOptions = {};

    // 페이지네이션 옵션 적용
    this.applyPaginationOptions(context, responseOptions, serializerOptions);
    
    return serializerOptions;
  }

  /**
   * 페이지네이션 옵션 적용
   */
  private applyPaginationOptions(
    context: ExecutionContext, 
    responseOptions: any, 
    serializerOptions: SerializerOptions
  ): void {
    // 페이지네이션 활성화 여부 확인
    const paginationEnabled = this.isPaginationEnabled(responseOptions);
    
    // 페이지네이션이 비활성화되었으면 아무것도 하지 않음
    if (!paginationEnabled) {
      return;
    }
    
    // 현재 요청에 페이지네이션 파라미터가 없는 경우에만 기본 크기 설정
    const requestHasPagination = this.requestHasPaginationParams(context);
    
    if (!requestHasPagination) {
      const defaultSize = this.getDefaultPageSize(responseOptions);
      
      serializerOptions.pagination = {
        number: 1,
        size: defaultSize,
        count: true
      };
    }
  }

  /**
   * 페이지네이션 활성화 여부 확인
   */
  private isPaginationEnabled(responseOptions: any): boolean {
    return (responseOptions.pagination?.enabled !== undefined)
      ? responseOptions.pagination.enabled
      : (this.moduleOptions?.pagination?.enabled !== undefined
        ? this.moduleOptions.pagination.enabled
        : true);
  }

  /**
   * 기본 페이지 크기 가져오기
   */
  private getDefaultPageSize(responseOptions: any): number {
    return responseOptions.pagination?.size || 
      this.moduleOptions?.pagination?.size || 
      10;
  }
  
  /**
   * 요청에 페이지네이션 파라미터가 있는지 확인
   */
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