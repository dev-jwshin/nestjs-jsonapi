import { Body, createParamDecorator, ExecutionContext, UseFilters, UsePipes } from '@nestjs/common';
import { JsonApiRequestPipe } from '../pipes/jsonapi-request.pipe';
import { JsonApiRequestTransformerService } from '../services/jsonapi-request-transformer.service';
import { RequestContextService } from '../services/request-context.service';
import { SerializerRegistry } from '../services/serializer-registry.service';

/**
 * JSON:API 형식 요청 본문을 변환하는 데코레이터
 * @param resourceType 자원 타입 (옵션)
 * @returns 파라미터 데코레이터
 */
export const JsonApiBody = (resourceType?: string) => {
  return createParamDecorator((data: any, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const rawBody = req.body;
    
    // JsonApiRequestTransformerService 생성
    const transformerService = new JsonApiRequestTransformerService(null);
    
    // JSON:API 형식인지 검사
    if (!rawBody || !rawBody.data) {
      throw new Error('요청이 JSON:API 형식이 아닙니다.');
    }
    
    // 요청 변환 - 결과는 attributes를 최상위로 가진 일반 객체
    return transformerService.transformRequest(rawBody, resourceType);
  });
};

/**
 * JSON:API 원본 요청을 그대로 받는 데코레이터
 * @returns 파라미터 데코레이터
 */
export const RawJsonApiBody = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.body;
  },
); 