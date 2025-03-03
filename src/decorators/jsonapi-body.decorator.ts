import { Body, createParamDecorator, ExecutionContext, UseFilters, UsePipes } from '@nestjs/common';
import { JsonApiRequestPipe } from '../pipes/jsonapi-request.pipe';

/**
 * JSON:API 형식 요청 본문을 변환하는 데코레이터
 * @param resourceType 자원 타입 (옵션)
 * @returns 파라미터 데코레이터
 */
export const JsonApiBody = (resourceType?: string) => {
  return (target: any, key: string, index: number) => {
    // 리소스 타입 메타데이터 설정
    const paramTypes = Reflect.getMetadata('design:paramtypes', target, key) || [];
    const paramType = paramTypes[index];
    if (paramType && resourceType) {
      paramType.prototype.resourceType = resourceType;
    }

    // Body 데코레이터와 파이프 적용
    Body(JsonApiRequestPipe)(target, key, index);
  };
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