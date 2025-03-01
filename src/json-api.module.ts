import { Module, DynamicModule, Global, Provider } from '@nestjs/common';
import { SerializerService } from './services/serializer.service';
import { AttributeProcessor } from './services/attribute-processor.service';
import { RelationshipProcessor } from './services/relationship-processor.service';
import { IncludeProcessor } from './services/include-processor.service';
import { SerializerRegistry } from './services/serializer-registry.service';
import { RequestContextService } from './services/request-context.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JSONAPIResponseInterceptor } from './interceptors/jsonapi-response.interceptor';
import { TypeOrmQueryBuilderService } from './services/typeorm-query-builder.service';
import { createJsonApiRepositoryProvider, JsonApiRepositoryOptions } from './providers/repository.factory';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';

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
    {
      provide: APP_INTERCEPTOR,
      useClass: JSONAPIResponseInterceptor,
    },
  ],
  exports: [
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
  static forRoot(): DynamicModule {
    return {
      module: JsonApiModule,
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
    const providers: Provider[] = entities.map(entityOption => {
      // entityOption이 EntityOptions 타입인지 확인
      if (typeof entityOption === 'object' && 'entity' in entityOption) {
        return createJsonApiRepositoryProvider(
          entityOption.entity, 
          entityOption.options || {}
        );
      }
      
      // 단순 엔티티 클래스인 경우 (기본 옵션 사용)
      return createJsonApiRepositoryProvider(entityOption);
    });

    return {
      module: JsonApiModule,
      providers: providers,
      exports: providers,
    };
  }
} 