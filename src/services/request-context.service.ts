import { Injectable, Scope } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Injectable({ scope: Scope.DEFAULT })
export class RequestContextService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<Request>();
  private readonly logFilePath = path.resolve(process.cwd(), 'debug.log');

  private logToFile(message: string): void {
    try {
      fs.appendFileSync(this.logFilePath, `${new Date().toISOString()} - ${message}\n`);
    } catch (err) {
      // 파일 로깅 실패 시 조용히 넘어갑니다
    }
  }

  set(request: Request): void {
    const message = '[REQUEST_CONTEXT_SERVICE] Setting request context';
    console.log(message);
    this.logToFile(message);
    
    if (request?.query) {
      this.logToFile(`[REQUEST_CONTEXT_SERVICE] Request query: ${JSON.stringify(request.query)}`);
    }
    
    this.asyncLocalStorage.enterWith(request);
  }

  get(): Request | undefined {
    const request = this.asyncLocalStorage.getStore();
    const message = `[REQUEST_CONTEXT_SERVICE] Getting request context: ${!!request}`;
    console.log(message);
    this.logToFile(message);
    
    if (request) {
      this.logToFile(`[REQUEST_CONTEXT_SERVICE] Request query: ${JSON.stringify(request.query)}`);
      this.logToFile(`[REQUEST_CONTEXT_SERVICE] jsonapiAllowedFilters: ${JSON.stringify(request['jsonapiAllowedFilters'])}`);
      console.log('[REQUEST_CONTEXT_SERVICE] Request query:', request.query);
      console.log('[REQUEST_CONTEXT_SERVICE] jsonapiAllowedFilters:', request['jsonapiAllowedFilters']);
    }
    
    return request;
  }
} 