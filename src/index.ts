// src/index.ts 새로 생성
export * from './json-api.module';

// 데코레이터
export * from './decorators/attribute.decorator';
export * from './decorators/relationship.decorator';
export * from './decorators/serializer.decorator';
export * from './decorators/response.decorator';
export * from './decorators/allowed-filters.decorator';
export * from './decorators/allowed-includes.decorator';
export * from './decorators/jsonapi-body.decorator';

// 인터페이스
export {
  SerializerOptions,
  ResourceObject,
  AttributeMetadata,
  RelationshipMetadata,
  PaginationMeta,
  PaginationLinks
} from './interfaces/serializer.interface';

export {
  QueryFilter,
  QuerySort,
  QueryPagination,
  QueryBuilderInterface,
  buildQueryParams
} from './interfaces/query-builder.interface';

export {
  JsonApiRequest,
  JsonApiRequestBody,
  TransformedRequestData
} from './interfaces/jsonapi-request.interface';

// 서비스
export * from './services/serializer.service';
export * from './services/serializer-registry.service';
export * from './services/request-context.service';
export * from './services/typeorm-query-builder.service';
export * from './services/jsonapi-request-transformer.service';

// 프로바이더
export * from './providers/repository.factory';

// 인터셉터
export * from './interceptors/jsonapi-response.interceptor';
export * from './interceptors/filters.interceptor';
export * from './interceptors/includes.interceptor';

// 파이프
export * from './pipes/jsonapi-request.pipe';

// 에러
export * from './errors/json-api.error';
export * from './errors/json-api-exception.filter';