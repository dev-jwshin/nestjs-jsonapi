import { Injectable, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';

@Injectable({ scope: Scope.DEFAULT })
export class RequestContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<Request>();

  set(request: Request): void {
    this.asyncLocalStorage.enterWith(request);
    console.log('Request set:', {
      url: request.url,
      query: JSON.stringify(request.query),
      method: request.method
    });
  }

  get(): Request | undefined {
    const request = this.asyncLocalStorage.getStore();
    if (!request) {
      console.log('Warning: No request context available');
    } else {
      console.log('Request context accessed:', {
        url: request.url,
        query: JSON.stringify(request.query)
      });
    }
    return request;
  }
} 