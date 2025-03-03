import { Body, createParamDecorator, ExecutionContext, UseFilters, UsePipes, BadRequestException } from '@nestjs/common';
import { JsonApiRequestPipe } from '../pipes/jsonapi-request.pipe';
import { JsonApiRequestTransformerService } from '../services/jsonapi-request-transformer.service';
import { RequestContextService } from '../services/request-context.service';
import { SerializerRegistry } from '../services/serializer-registry.service';

export interface JsonApiBodyOptions {
  /**
   * 리소스 타입 (선택 사항)
   * 지정하지 않으면 요청 본문의 type 속성 사용
   */
  resourceType?: string;
  
  /**
   * _type 속성 유지 여부 (기본값: false)
   * true로 설정하면 변환된 객체에 _type 속성이 포함됨
   */
  preserveType?: boolean;
}

/**
 * JSON:API 형식 요청 본문을 변환하는 데코레이터
 * 리소스 타입은 선택 사항입니다. 지정하지 않으면 요청 본문의 type 속성을 사용합니다.
 */
export const JsonApiBody = createParamDecorator(
  (options: string | JsonApiBodyOptions | undefined, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    const rawBody = req.body;
    
    // 옵션 처리
    let resourceType: string | undefined;
    let preserveType = false;
    
    if (typeof options === 'string') {
      resourceType = options;
    } else if (options && typeof options === 'object') {
      resourceType = options.resourceType;
      preserveType = options.preserveType === true;
    }
    
    // JsonApiRequestTransformerService 생성
    const transformerService = new JsonApiRequestTransformerService(null);
    
    // JSON:API 형식인지 검사
    if (!rawBody || !rawBody.data) {
      throw new BadRequestException('요청이 JSON:API 형식이 아닙니다.');
    }
    
    // 리소스 타입 검증 (데코레이터에서 지정하지 않은 경우 본문의 type 속성 확인)
    if (!resourceType && (!rawBody.data.type || typeof rawBody.data.type !== 'string')) {
      throw new BadRequestException('JSON:API 요청에 유효한 resource type이 없습니다. @JsonApiBody() 데코레이터에 리소스 타입을 지정하거나 요청 본문에 type 속성을 포함하세요.');
    }
    
    // 요청 변환 - 결과는 attributes를 최상위로 가진 일반 객체
    const result = transformerService.transformRequest(rawBody, resourceType);
    
    // _type 속성 제거 (preserveType이 false인 경우)
    if (!preserveType && result) {
      if (Array.isArray(result)) {
        result.forEach(item => {
          if (item && item._type) {
            delete item._type;
          }
        });
      } else if (result._type) {
        delete result._type;
      }
    }
    
    return result;
  }
);

/**
 * JSON:API 원본 요청을 그대로 받는 데코레이터
 */
export const RawJsonApiBody = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.body;
  }
); 