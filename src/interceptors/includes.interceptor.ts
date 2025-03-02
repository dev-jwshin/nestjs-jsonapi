import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { JSONAPI_ALLOWED_INCLUDES } from '../decorators/allowed-includes.decorator';
import { RequestContextService } from '../services/request-context.service';

/**
 * 컨트롤러와 메서드에 적용된 allowedIncludes 설정을 처리하는 인터셉터
 */
@Injectable()
export class IncludesInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly requestContextService: RequestContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = this.requestContextService.get();
    if (!request) {
      return next.handle();
    }

    // 허용된 인클루드 설정을 요청 객체에 저장
    this.setAllowedIncludes(context, request);

    return next.handle();
  }

  /**
   * 허용된 인클루드 설정
   */
  private setAllowedIncludes(context: ExecutionContext, request: any): void {
    // 메서드 레벨 인클루드 설정 확인
    const methodIncludes = this.reflector.get<string[]>(
      JSONAPI_ALLOWED_INCLUDES,
      context.getHandler(),
    );

    // 클래스 레벨 인클루드 설정 확인
    const classIncludes = this.reflector.get<string[]>(
      JSONAPI_ALLOWED_INCLUDES,
      context.getClass(),
    );

    // 메서드 레벨 설정이 있으면 우선 사용, 없으면 클래스 레벨 설정 사용
    const allowedIncludes = methodIncludes || classIncludes;
    
    // request 객체에 설정 저장 (추후 서비스에서 사용)
    request['jsonapiAllowedIncludes'] = allowedIncludes;
  }
} 