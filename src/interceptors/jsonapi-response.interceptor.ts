import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Type } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SerializerService } from '../services/serializer.service';
import { JSONAPI_RESPONSE_SERIALIZER } from '../decorators/response.decorator';

@Injectable()
export class JSONAPIResponseInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly serializerService: SerializerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // 응답이 이미 처리되었거나 없는 경우
        if (!data || data.data !== undefined) {
          return data;
        }

        // 컨트롤러 메서드에서 메타데이터 가져오기
        const options = this.reflector.get(
          JSONAPI_RESPONSE_SERIALIZER,
          context.getHandler(),
        );

        // 컨트롤러 클래스에서 메타데이터 가져오기 (메서드에 없는 경우)
        const classOptions = this.reflector.get(
          JSONAPI_RESPONSE_SERIALIZER,
          context.getClass(),
        );

        const responseOptions = options || classOptions;

        // 직렬화기가 지정되지 않은 경우
        if (!responseOptions || !responseOptions.serializer) {
          return data;
        }

        // 응답 직렬화
        return this.serializerService.serialize(
          responseOptions.serializer,
          data,
        );
      }),
    );
  }
} 