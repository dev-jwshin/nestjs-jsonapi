import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { JSONAPI_ALLOWED_FILTERS } from '../decorators/allowed-filters.decorator';
import { JSONAPI_ALLOWED_INCLUDES } from '../decorators/allowed-includes.decorator';
import { RequestContextService } from '../services/request-context.service';

/**
 * 컨트롤러와 메서드에 적용된 allowedFilters와 allowedIncludes 설정을 처리하는 인터셉터
 */
@Injectable()
export class FiltersIncludesInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 컨텍스트에서 직접 요청 객체 가져오기
    const request = context.switchToHttp().getRequest();
    if (!request) {
      return next.handle();
    }

    // 허용된 필터와 인클루드 설정을 요청 객체에 저장
    this.setAllowedFilters(context, request);
    this.setAllowedIncludes(context, request);

    return next.handle();
  }

  /**
   * 허용된 필터 설정
   */
  private setAllowedFilters(context: ExecutionContext, request: any): void {
    // 메서드 레벨 설정을 먼저 확인
    const methodFilters = this.reflector.get<string[]>(
      JSONAPI_ALLOWED_FILTERS,
      context.getHandler(),
    );

    // 클래스 레벨 설정 확인
    const classFilters = this.reflector.get<string[]>(
      JSONAPI_ALLOWED_FILTERS,
      context.getClass(),
    );

    // 메서드 레벨 설정이 있으면 우선 사용, 없으면 클래스 레벨 설정 사용
    const allowedFilters = methodFilters || classFilters;
    
    // request 객체에 설정 저장 (추후 서비스에서 사용)
    request['jsonapiAllowedFilters'] = allowedFilters;
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