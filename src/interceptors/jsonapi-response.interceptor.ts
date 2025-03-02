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
  ) {
    // reflector와 serializerService가 주입되었는지 확인
    if (!this.reflector) {
      console.error('Reflector가 주입되지 않았습니다. JSON:API 인터셉터가 제대로 작동하지 않을 수 있습니다.');
    }
    
    if (!this.serializerService) {
      console.error('SerializerService가 주입되지 않았습니다. JSON:API 인터셉터가 제대로 작동하지 않을 수 있습니다.');
    }
  }

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
      // 요청 객체 가져오기
      const request = context.switchToHttp().getRequest();
      
      // 직렬화 옵션 가져오기
      let responseOptions = this.getSerializerOptions(context);
      
      // 직렬화기가 없는 경우 기본 직렬화기 사용 시도
      if (!responseOptions || !responseOptions.serializer) {
        // 컨트롤러에서 직렬화기를 찾지 못한 경우 엔티티 타입을 추측
        const entityType = this.guessEntityType(data);
        
        if (entityType) {
          console.log('자동으로 감지된 엔티티 타입 사용:', entityType.name);
          responseOptions = {
            serializer: entityType
          };
        } else {
          // 여전히 직렬화기를 찾지 못했다면 원본 데이터 반환
          return data;
        }
      }

      // 페이지네이션 옵션 설정
      const serializerOptions = this.buildSerializerOptions(context, responseOptions);
      
      if (request) {
        // 요청 객체를 serializerOptions에 넘겨서 처리할 수 있도록 함
        serializerOptions.request = request;
      }

      // serializerService가 정의되어 있는지 확인
      if (!this.serializerService) {
        console.error('serializerService가 정의되지 않았습니다.');
        return data;
      }

      // 응답 직렬화
      try {
        return this.serializerService.serialize(
          responseOptions.serializer,
          data,
          serializerOptions
        );
      } catch (error) {
        console.error('JSON:API 직렬화 중 오류 발생:', error);
        console.log('직렬화에 실패하여 원본 데이터를 반환합니다. JsonApiModule이 제대로 설정되었는지 확인하세요:');
        console.log('app.module.ts에 다음과 같이 등록하세요:');
        console.log(`
          import { Module } from '@nestjs/common';
          import { JsonApiModule } from '@foryourdev/nestjs-jsonapi';
          
          @Module({
            imports: [
              JsonApiModule.forRoot({
                pagination: { enabled: true, size: 10 }
              }),
              // 다른 모듈...
            ],
          })
          export class AppModule {}
        `);
        
        return data;
      }
    } catch (error) {
      console.error('JSON:API 응답 처리 중 오류 발생:', error);
      // 오류 발생 시에도 기본 JSON:API 형식으로 응답 시도
      try {
        return {
          data: Array.isArray(data) 
            ? data.map(item => this.createBasicResource(item))
            : this.createBasicResource(data)
        };
      } catch (fallbackError) {
        console.error('기본 JSON:API 응답 생성 실패:', fallbackError);
        return data;
      }
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
        const handler = context.getHandler();
        const cls = context.getClass();
        
        if (!handler || !cls) {
          console.warn('컨트롤러 핸들러 또는 클래스를 가져올 수 없습니다.');
          return null;
        }
        
        const methodOptions = this.reflector.get(
          JSONAPI_RESPONSE_SERIALIZER,
          handler,
        );

        // 컨트롤러 클래스에서 메타데이터 가져오기 (메서드에 없는 경우)
        const classOptions = this.reflector.get(
          JSONAPI_RESPONSE_SERIALIZER,
          cls,
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

  // 엔티티 타입 추측 (배열인 경우 첫 번째 항목을 기준으로)
  private guessEntityType(data: any): any {
    if (!data) return null;
    
    try {
      // 배열인 경우 첫 번째 항목 사용
      const item = Array.isArray(data) ? data[0] : data;
      
      if (item && item.constructor && item.constructor.name) {
        if (item.constructor.name !== 'Object') {
          return item.constructor;
        }
      }
    } catch (error) {
      console.warn('엔티티 타입 추측 실패:', error);
    }
    
    return null;
  }
  
  // 기본 JSON:API 리소스 객체 생성
  private createBasicResource(item: any): any {
    if (!item) return null;
    
    try {
      const id = item.id?.toString() || Math.random().toString(36).substring(2);
      const type = item.constructor?.name?.toLowerCase() || 'resource';
      
      const attributes = {};
      
      // id를 제외한 모든 속성을 attributes에 추가
      Object.keys(item).forEach(key => {
        if (key !== 'id' && typeof item[key] !== 'function' && !Array.isArray(item[key])) {
          attributes[key] = item[key];
        }
      });
      
      return {
        id,
        type,
        attributes
      };
    } catch (error) {
      console.warn('기본 리소스 객체 생성 실패:', error);
      return { id: '0', type: 'unknown', attributes: {} };
    }
  }
} 