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
        try {
          return this.processResponse(context, data);
        } catch (error) {
          console.error('JSON:API 응답 처리 오류:', error);
          return data; // 오류 발생 시 원본 데이터 반환
        }
      })
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

    try {
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
    } catch (error) {
      console.error('JSON:API 응답 처리 중 오류 발생:', error);
      return data; // 오류 발생 시 원본 데이터 반환
    }
  }

  /**
   * 응답 처리를 건너뛰어야 하는지 확인
   */
  private shouldSkipProcessing(context: ExecutionContext, data: any): boolean {
    try {
      // 응답이 없는 경우 처리 건너뛰기
      if (!data) return true;
      
      // 이미 JSON:API 형식으로 직렬화된 경우 처리 건너뛰기
      if (data.data !== undefined) return true;
      
      // 응답 객체 가져오기 시도
      try {
        const response = context.switchToHttp().getResponse();
        // 응답 객체가 없거나 No Content 상태인 경우 처리 건너뛰기
        if (!response || response.statusCode === 204) return true;
      } catch (error) {
        // 응답 객체를 가져올 수 없으면 안전하게 false 반환 (처리 진행)
        return false;
      }
      
      return false;
    } catch (error) {
      console.warn('JSON:API 처리 건너뛰기 확인 중 오류:', error);
      return true; // 오류 발생 시 안전하게 처리 건너뛰기
    }
  }

  /**
   * 컨트롤러 메서드/클래스에서 직렬화 옵션 가져오기
   */
  private getSerializerOptions(context: ExecutionContext): any {
    try {
      // reflector가 없으면 null 반환
      if (!this.reflector) {
        console.warn('JSON:API reflector가 정의되지 않았습니다.');
        return null;
      }

      try {
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
      } catch (error) {
        console.warn('JSON:API 메타데이터 가져오기 실패:', error);
        return null;
      }
    } catch (error) {
      console.error('JSON:API 직렬화 옵션 가져오기 실패:', error);
      return null;
    }
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
    try {
      // 페이지네이션 활성화 여부 확인
      const paginationEnabled = this.isPaginationEnabled(responseOptions);
      
      // 페이지네이션이 비활성화되었으면 아무것도 하지 않음
      if (!paginationEnabled) {
        return;
      }
      
      // 페이지네이션 파라미터 확인 시 예외 처리 추가
      let requestHasPagination = false;
      try {
        requestHasPagination = this.requestHasPaginationParams(context);
      } catch (error) {
        console.warn('JSON:API 페이지네이션 파라미터 확인 실패:', error);
      }
      
      if (!requestHasPagination) {
        const defaultSize = this.getDefaultPageSize(responseOptions);
        
        serializerOptions.pagination = {
          number: 1,
          size: defaultSize,
          count: true
        };
      }
    } catch (error) {
      console.warn('JSON:API 페이지네이션 옵션 적용 실패:', error);
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
    try {
      const request = context.switchToHttp().getRequest();
      if (!request || !request.query) return false;
      
      const query = request.query;
      
      // Express에서 query parameter가 page[number]와 같은 형식으로 들어올 경우 처리
      // 두 가지 가능한 형식 모두 확인: 
      // 1. query.page?.number (객체 형태)
      // 2. query['page[number]'] (문자열 키 형태)
      return (
        // 객체 형태로 파싱된 경우
        (query.page && (
          query.page.number !== undefined || 
          query.page.size !== undefined ||
          query.page.after !== undefined ||
          query.page.before !== undefined
        )) ||
        // 문자열 키 형태로 존재하는 경우
        query['page[number]'] !== undefined ||
        query['page[size]'] !== undefined ||
        query['page[after]'] !== undefined ||
        query['page[before]'] !== undefined
      );
    } catch (error) {
      // 오류 발생 시 false 반환
      return false;
    }
  }
} 