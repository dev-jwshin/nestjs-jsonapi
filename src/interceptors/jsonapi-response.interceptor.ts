import { 
  Injectable, 
  NestInterceptor, 
  ExecutionContext, 
  CallHandler, 
  Type, 
  Optional, 
  Inject,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SerializerService } from '../services/serializer.service';
import { SerializerRegistry } from '../services/serializer-registry.service';
import { SerializerOptions } from '../interfaces/serializer.interface';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { JSONAPI_RESPONSE_SERIALIZER } from '../decorators/response.decorator';

@Injectable()
export class JSONAPIResponseInterceptor implements NestInterceptor {
  private reflector: Reflector;
  private serializerService: SerializerService;
  private serializerRegistry: SerializerRegistry;
  private moduleOptions: any;
  private _hasAttemptedLoading: boolean = false;

  constructor(
    @Optional() private readonly moduleRef?: ModuleRef,
    @Optional() @Inject('JSONAPI_MODULE_OPTIONS') moduleOptions?: any,
  ) {
    this.moduleOptions = moduleOptions || {};
    
    // 모듈이 초기화된 후 서비스 인스턴스 가져오기
    if (this.moduleRef) {
      setTimeout(() => {
        try {
          this.reflector = this.moduleRef.get(Reflector, { strict: false });
          this.serializerService = this.moduleRef.get(SerializerService, { strict: false });
          this.serializerRegistry = this.moduleRef.get(SerializerRegistry, { strict: false });
          
          if (!this.reflector) {
            console.error('Reflector를 ModuleRef에서 찾을 수 없습니다.');
            this.logModuleSetupInstructions();
          }
          
          if (!this.serializerService) {
            console.error('SerializerService를 ModuleRef에서 찾을 수 없습니다.');
            this.logModuleSetupInstructions();
          }
          
          if (!this.serializerRegistry) {
            console.error('SerializerRegistry를 ModuleRef에서 찾을 수 없습니다.');
            this.logModuleSetupInstructions();
          }
        } catch (error) {
          console.error('의존성 확인 중 오류 발생:', error);
          this.logModuleSetupInstructions();
        }
      }, 0);
    } else {
      console.error('ModuleRef가 주입되지 않았습니다. NestJS 모듈이 올바르게 설정되었는지 확인하세요.');
      this.logModuleSetupInstructions();
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
    // 처리를 건너뛰어야 하는 경우 확인
    if (this.shouldSkipProcessing(context, data)) {
      return data;
    }

    // 컨트롤러 메서드에서 JSON:API 응답 데코레이터 정보 가져오기
    const handler = context.getHandler();
    const responseOptions = this.reflector.get('jsonapi_response', handler);
    
    if (!responseOptions) {
      // @JSONAPIResponse 데코레이터를 사용하지 않은 경우
      return data;
    }
    
    // null 또는 undefined인 경우 그대로 반환
    if (data === null || data === undefined) {
      return data;
    }

    try {
      // 직렬화 옵션 구성
      const serializerOptions = this.buildSerializerOptions(context, responseOptions);
      
      // 직렬화기 등록 확인
      if (!this.serializerRegistry) {
        console.error('SerializerRegistry가 주입되지 않았습니다. JsonApiModule 설정을 확인하세요.');
        return data;
      }

      // 직렬화기 등록
      this.serializerRegistry.registerByClassName(responseOptions.serializer);

      // 응답 직렬화
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
   * 컨트롤러 메서드/클래스 옵션을 기반으로 직렬화 옵션을 구성합니다.
   */
  private buildSerializerOptions(context: ExecutionContext, responseOptions: any): SerializerOptions {
    const request = context.switchToHttp().getRequest();
    const serializerOptions: SerializerOptions = {};
    
    // 필터링 처리
    if (request.query && request.query.filter) {
      serializerOptions.filter = {};
      for (const key in request.query.filter) {
        serializerOptions.filter[key] = request.query.filter[key];
      }
    }
    
    // 정렬 처리
    if (request.query && request.query.sort) {
      const sortFields = request.query.sort.split(',');
      serializerOptions.sort = sortFields.map(field => {
        if (field.startsWith('-')) {
          return { field: field.substring(1), direction: 'desc' };
        }
        return { field, direction: 'asc' };
      });
    }
    
    // 페이지네이션 처리
    if (
      request.query && 
      (request.query['page[number]'] || request.query['page[size]'])
    ) {
      serializerOptions.pagination = {
        enabled: this.isPaginationEnabled(responseOptions),
        number: request.query['page[number]'] ? parseInt(request.query['page[number]']) : 1,
        size: request.query['page[size]'] ? 
              parseInt(request.query['page[size]']) : 
              this.getDefaultPageSize(responseOptions)
      };
    } else {
      // 기본 페이지네이션 설정
      serializerOptions.pagination = {
        enabled: this.isPaginationEnabled(responseOptions),
        size: this.getDefaultPageSize(responseOptions)
      };
    }
    
    // 인클루드 처리
    if (request.query && request.query.include) {
      serializerOptions.include = request.query.include.split(',');
    }
    
    // 필드 필터링 처리
    if (request.query) {
      const fieldsEntries = Object.entries(request.query)
        .filter(([key]) => key.startsWith('fields[') && key.endsWith(']'));
      
      if (fieldsEntries.length > 0) {
        serializerOptions.fields = {};
        
        for (const [key, value] of fieldsEntries) {
          const resourceType = key.substring(7, key.length - 1);
          serializerOptions.fields[resourceType] = String(value).split(',');
        }
      }
    }
    
    return serializerOptions;
  }

  /**
   * 페이지네이션이 활성화되어 있는지 확인합니다.
   */
  private isPaginationEnabled(responseOptions: any): boolean {
    // 1. 응답 옵션의 pagination.enabled 확인
    if (responseOptions.pagination?.enabled !== undefined) {
      return responseOptions.pagination.enabled;
    }
    
    // 2. 모듈 옵션의 pagination.enabled 확인
    if (this.moduleOptions?.pagination?.enabled !== undefined) {
      return this.moduleOptions.pagination.enabled;
    }
    
    // 3. 기본값은 true
    return true;
  }

  /**
   * 기본 페이지 크기를 반환합니다.
   */
  private getDefaultPageSize(responseOptions: any): number {
    // 1. 응답 옵션의 pagination.size 확인
    if (responseOptions.pagination?.size !== undefined) {
      return responseOptions.pagination.size;
    }
    
    // 2. 모듈 옵션의 pagination.size 확인
    if (this.moduleOptions?.pagination?.size !== undefined) {
      return this.moduleOptions.pagination.size;
    }
    
    // 3. 기본값은 10
    return 10;
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

  /**
   * 올바른 모듈 설정 방법을 로그로 출력
   */
  private logModuleSetupInstructions(): void {
    console.log('\n=== JSON API 모듈 설정 안내 ===');
    console.log('1. 애플리케이션 모듈에 JsonApiModule을 다음과 같이 등록하세요:');
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
    console.log('\n2. tsconfig.json에 다음 컴파일러 옵션이 있는지 확인하세요:');
    console.log(`
      "compilerOptions": {
        "emitDecoratorMetadata": true,
        "experimentalDecorators": true,
        // 기타 옵션...
      }
    `);
    console.log('\n3. 컨트롤러에서 올바르게 데코레이터를 사용하고 있는지 확인하세요:');
    console.log(`
      import { JSONAPIResponse } from '@foryourdev/nestjs-jsonapi';
      import { UserSerializer } from './user.serializer';
      
      @Controller('users')
      export class UserController {
        @Get()
        @JSONAPIResponse(UserSerializer)
        findAll() {
          // ...
        }
      }
    `);
    console.log('=== 설정 안내 종료 ===\n');
  }
} 