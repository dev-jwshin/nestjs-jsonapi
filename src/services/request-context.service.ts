import { Injectable, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';

@Injectable({ scope: Scope.DEFAULT })
export class RequestContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<Request>();

  set(request: Request): void {
    console.log('[REQUEST_CONTEXT_SERVICE] Setting request context');
    this.asyncLocalStorage.enterWith(request);
  }

  get(): Request | undefined {
    const request = this.asyncLocalStorage.getStore();
    console.log('[REQUEST_CONTEXT_SERVICE] Getting request context:', !!request);
    if (request) {
      console.log('[REQUEST_CONTEXT_SERVICE] Request query:', request.query);
      console.log('[REQUEST_CONTEXT_SERVICE] jsonapiAllowedFilters:', request['jsonapiAllowedFilters']);
    }
    return request;
  }
} 