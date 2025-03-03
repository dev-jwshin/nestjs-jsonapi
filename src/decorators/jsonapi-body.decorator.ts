import { Body, createParamDecorator, ExecutionContext, UseFilters, UsePipes, BadRequestException, ValidationPipe, applyDecorators } from '@nestjs/common';
import { JsonApiRequestPipe } from '../pipes/jsonapi-request.pipe';
import { JsonApiRequestTransformerService } from '../services/jsonapi-request-transformer.service';
import { RequestContextService } from '../services/request-context.service';
import { SerializerRegistry } from '../services/serializer-registry.service';
import { Type } from '@nestjs/common';

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
 * 
 * 참고: 이 데코레이터는 요청 형식만 변환하고 유효성 검사는 수행하지 않습니다.
 * ValidationPipe를 함께 사용하려면 다음과 같이 @UsePipes 데코레이터를 추가해야 합니다:
 * 
 * @Post('endpoint')
 * @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
 * async method(@JsonApiBody() dto: MyDto) { ... }
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
 * ValidationPipe와 함께 사용할 수 있는 JSON:API Body 데코레이터
 * @param options 옵션 또는 리소스 타입
 * @param validationPipeOptions ValidationPipe 옵션
 */
export function JsonApiBodyWithValidation(
  options?: string | JsonApiBodyOptions,
  validationPipeOptions: ValidationPipeOptions = { transform: true, whitelist: true }
) {
  // Body 데코레이터에 옵션을 전달하여 파이프 체인 생성
  // JsonApiBody 대신 Body 직접 사용하되, JSON API 변환과 유효성 검사를 순차적으로 적용
  return Body({
    transform: (body) => {
      // JsonApiRequestTransformerService 생성하여 본문 변환
      const transformerService = new JsonApiRequestTransformerService(null);
      
      // 옵션 처리
      let resourceType: string | undefined;
      let preserveType = false;
      
      if (typeof options === 'string') {
        resourceType = options;
      } else if (options && typeof options === 'object') {
        resourceType = options.resourceType;
        preserveType = options.preserveType === true;
      }
      
      // 변환 실행
      const result = transformerService.transformRequest(body, resourceType);
      
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
  }, new ValidationPipe(validationPipeOptions));
}

/**
 * JSON:API 원본 요청을 그대로 받는 데코레이터
 */
export const RawJsonApiBody = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.body;
  }
);

// ValidationPipe 옵션 인터페이스
interface ValidationPipeOptions {
  transform?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  validationError?: { target?: boolean; value?: boolean };
  exceptionFactory?: (errors: any[]) => any;
} 