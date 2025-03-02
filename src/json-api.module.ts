import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { SerializerService } from './services/serializer.service';
import { AttributeProcessor } from './services/attribute-processor.service';
import { RelationshipProcessor } from './services/relationship-processor.service';
import { IncludeProcessor } from './services/include-processor.service';
import { SerializerRegistry } from './services/serializer-registry.service';
import { RequestContextService } from './services/request-context.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JSONAPIResponseInterceptor } from './interceptors/jsonapi-response.interceptor';
import { FiltersIncludesInterceptor } from './interceptors/filters-includes.interceptor';
import { TypeOrmQueryBuilderService } from './services/typeorm-query-builder.service';
import { createJsonApiRepositoryProvider, JsonApiRepositoryOptions } from './providers/repository.factory';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { ModuleRef } from '@nestjs/core';
import { Reflector } from '@nestjs/core';

/**
 * 엔티티별 JSON:API 옵션 인터페이스
 */
export interface EntityOptions {
  /**
   * TypeORM 엔티티 클래스
   */
  entity: EntityClassOrSchema;
  
  /**
   * 해당 엔티티의 Repository 옵션
   */
  options?: JsonApiRepositoryOptions;
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
}

@Global()
@Module({
  providers: [
    AttributeProcessor,
    RelationshipProcessor,
    IncludeProcessor,
    SerializerRegistry,
    RequestContextService,
    SerializerService,
    TypeOrmQueryBuilderService,
    {
      provide: 'JSONAPI_MODULE_OPTIONS',
      useValue: {
        pagination: {
          enabled: true,
          size: 10
        }
      }
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (moduleRef: ModuleRef, moduleOptions: any) => {
        return new JSONAPIResponseInterceptor(moduleRef, moduleOptions);
      },
      inject: [ModuleRef, 'JSONAPI_MODULE_OPTIONS']
    },
    {
      provide: APP_INTERCEPTOR,
      useFactory: (reflector: Reflector) => {
        return new FiltersIncludesInterceptor(reflector);
      },
      inject: [Reflector]
    },
  ],
  exports: [
    AttributeProcessor,
    RelationshipProcessor, 
    IncludeProcessor,
    SerializerService, 
    SerializerRegistry, 
    RequestContextService,
    TypeOrmQueryBuilderService,
  ],
})
export class JsonApiModule {
  /**
   * 기본 모듈 설정
   */
  static forRoot(options: JsonApiModuleOptions = {}): DynamicModule {
    return {
      module: JsonApiModule,
      providers: [
        {
          provide: 'JSONAPI_MODULE_OPTIONS',
          useValue: this.getDefaultModuleOptions(options)
        }
      ],
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
      }
    };
  }

  /**
   * JSON:API 쿼리 파라미터가 자동으로 적용되는 엔티티 저장소 등록
   * @param entities 엔티티 클래스 배열 또는 엔티티 옵션 배열
   * @returns 동적 모듈 구성
   * 
   * @example
   * // 기본 사용법 (모든 필터와 인클루드 허용)
   * JsonApiModule.forFeature([User, Post])
   * 
   * // 엔티티별 상세 옵션 설정
   * JsonApiModule.forFeature([
   *   { 
   *     entity: User, 
   *     options: { 
   *       allowedFilters: ['name', 'role'], 
   *       allowedIncludes: ['profile', 'posts'] 
   *     } 
   *   },
   *   { 
   *     entity: Post,
   *     options: {
   *       allowedFilters: ['title', 'status'],
   *       allowedIncludes: ['author', 'comments']
   *     }
   *   }
   * ])
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
        entityOption.options || {}
      );
    }
    
    // 단순 엔티티 클래스인 경우 (기본 옵션 사용)
    return createJsonApiRepositoryProvider(entityOption);
  }
} 