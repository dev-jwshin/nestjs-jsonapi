import { Injectable, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';

@Injectable({ scope: Scope.DEFAULT })
export class RequestContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<Request>();

  set(request: Request): void {
    this.asyncLocalStorage.enterWith(request);
  }

  get(): Request | undefined {
    const request = this.asyncLocalStorage.getStore();
    return request;
  }
} 