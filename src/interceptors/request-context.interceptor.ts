import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from '../services/request-context.service';

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContextService: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    console.log('[REQUEST_CONTEXT_INTERCEPTOR] Setting request context with query:', request.query);
    this.requestContextService.set(request);
    return next.handle();
  }
}