import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { SerializerService } from './services/serializer.service';
import { AttributeProcessor } from './services/attribute-processor.service';
import { RelationshipProcessor } from './services/relationship-processor.service';
import { IncludeProcessor } from './services/include-processor.service';
import { SerializerRegistry } from './services/serializer-registry.service';
import { RequestContextService } from './services/request-context.service';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { JSONAPIResponseInterceptor } from './interceptors/jsonapi-response.interceptor';
import { FiltersInterceptor } from './interceptors/filters.interceptor';
import { IncludesInterceptor } from './interceptors/includes.interceptor';
import { TypeOrmQueryBuilderService } from './services/typeorm-query-builder.service';
import { createJsonApiRepositoryProvider } from './providers/repository.factory';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { RequestContextInterceptor } from './interceptors';
import { JsonApiRequestTransformerService } from './services/jsonapi-request-transformer.service';
import { JsonApiRequestPipe } from './pipes/jsonapi-request.pipe';
import { JsonApiExceptionFilter } from './errors/json-api-exception.filter';
import { JsonApiBodyInterceptor } from './decorators/jsonapi-body.decorator';

/**
 * 엔티티별 JSON:API 옵션 인터페이스
 */
export interface EntityOptions {
  /**
   * TypeORM 엔티티 클래스
   */
  entity: EntityClassOrSchema;
}

/**
 * 전역 JSON:API 옵션 인터페이스
 */
export interface JsonApiModuleOptions {
  /**
   * 페이지네이션 설정
   */
  pagination?: {
    /**
     * 페이지네이션 활성화 여부 (기본값: true)
     */
    enabled?: boolean;
    /**
     * 기본 페이지 크기 (기본값: 10)
     */
    size?: number;
  };

  /**
   * 전역 예외 필터 활성화 여부 (기본값: true)
   * true로 설정하면 모든 예외가 JSON:API 형식으로 변환됩니다.
   */
  enableGlobalExceptionFilter?: boolean;
}

@Global()
@Module({
  providers: [
    SerializerService,
    AttributeProcessor,
    RelationshipProcessor,
    IncludeProcessor,
    SerializerRegistry,
    RequestContextService,
    TypeOrmQueryBuilderService,
    JsonApiRequestTransformerService,
    JsonApiRequestPipe,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: JSONAPIResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: FiltersInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: IncludesInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: JsonApiBodyInterceptor,
    },
  ],
  exports: [
    SerializerService, 
    SerializerRegistry, 
    RequestContextService,
    TypeOrmQueryBuilderService,
    JsonApiRequestTransformerService,
    JsonApiRequestPipe,
  ],
})
export class JsonApiModule {
  /**
   * 기본 모듈 설정
   */
  static forRoot(options: JsonApiModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: 'JSONAPI_MODULE_OPTIONS',
        useValue: this.getDefaultModuleOptions(options)
      }
    ];

    // 전역 예외 필터가 활성화되어 있으면 추가
    if (options.enableGlobalExceptionFilter !== false) {
      providers.push({
        provide: APP_FILTER,
        useClass: JsonApiExceptionFilter,
      });
    }

    return {
      module: JsonApiModule,
      providers,
      exports: ['JSONAPI_MODULE_OPTIONS']
    };
  }

  /**
   * 기본 모듈 옵션 생성
   */
  private static getDefaultModuleOptions(options: JsonApiModuleOptions): Record<string, any> {
    return {
      pagination: {
        enabled: options.pagination?.enabled !== undefined ? options.pagination.enabled : true,
        size: options.pagination?.size || 10
      },
      enableGlobalExceptionFilter: options.enableGlobalExceptionFilter !== false
    };
  }

  /**
   * JSON:API 쿼리 파라미터가 자동으로 적용되는 엔티티 저장소 등록
   * @param entities 엔티티 클래스 배열 또는 엔티티 옵션 배열
   * @returns 동적 모듈 구성
   */
  static forFeature(
    entities: (EntityClassOrSchema | EntityOptions)[]
  ): DynamicModule {
    const providers: Provider[] = entities.map(entityOption => 
      this.createRepositoryProvider(entityOption)
    );

    return {
      module: JsonApiModule,
      providers: providers,
      exports: providers,
    };
  }

  /**
   * 저장소 프로바이더 생성
   */
  private static createRepositoryProvider(
    entityOption: EntityClassOrSchema | EntityOptions
  ): Provider {
    // entityOption이 EntityOptions 타입인지 확인
    if (typeof entityOption === 'object' && 'entity' in entityOption) {
      return createJsonApiRepositoryProvider(
        entityOption.entity, 
      );
    }
    
    // 단순 엔티티 클래스인 경우 (기본 옵션 사용)
    return createJsonApiRepositoryProvider(entityOption);
  }
} 