import { Body, createParamDecorator, ExecutionContext, UseFilters, UsePipes } from '@nestjs/common';
import { JsonApiRequestPipe } from '../pipes/jsonapi-request.pipe';
import { JsonApiRequestTransformerService } from '../services/jsonapi-request-transformer.service';
import { Injectable, NestInterceptor, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';

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
    Body()(target, key, index);
    
    // JsonApiRequestPipe를 컨트롤러 메소드 수준에서 적용하도록 메타데이터 추가
    const pipes = Reflect.getMetadata('__jsonapi_pipes__', target.constructor, key) || [];
    pipes.push({
      pipe: new JsonApiRequestPipe(new JsonApiRequestTransformerService(null)),
      index,
      resourceType
    });
    Reflect.defineMetadata('__jsonapi_pipes__', pipes, target.constructor, key);
  };
};

// JsonApiBody 파이프 처리를 위한 인터셉터 추가
@Injectable()
export class JsonApiBodyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const handler = context.getHandler();
    const pipes = Reflect.getMetadata('__jsonapi_pipes__', context.getClass(), handler.name) || [];
    
    if (pipes.length) {
      const req = context.switchToHttp().getRequest();
      
      for (const { pipe, index, resourceType } of pipes) {
        try {
          // Body 파라미터 변환
          if (req.body && index !== undefined) {
            const args = context.getArgs();
            args[index] = pipe.transform(req.body, { type: 'body', metatype: pipe.metatype });
          }
        } catch (error) {
          // 에러 처리
          throw error;
        }
      }
    }
    
    return next.handle();
  }
}

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