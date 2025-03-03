import { HttpException } from '@nestjs/common';

export interface JsonApiErrorSource {
  pointer?: string;
  parameter?: string;
}

export interface JsonApiErrorOptions {
  source?: JsonApiErrorSource;
  code?: string;
  meta?: Record<string, any>;
}

/**
 * JSON:API Error Class
 * 
 * Represents an error following the JSON:API specification.
 * When thrown, this error will be automatically formatted according to
 * the JSON:API error format.
 */
export class JsonApiError extends HttpException {
  public readonly title: string;
  public readonly statusCode: number;
  public readonly source?: JsonApiErrorSource;
  public readonly code?: string;
  public readonly meta?: Record<string, any>;

  /**
   * Creates a new JSON:API error
   * 
   * @param message Error message to be used as the title
   * @param status HTTP status code (default: 400)
   * @param options Additional error options (source, code, meta)
   */
  constructor(message: string, status = 400, options?: JsonApiErrorOptions) {
    // Create error response object in JSON:API format
    const errorResponse = {
      errors: [
        {
          status: String(status),
          title: message,
          ...(options?.source && { source: options.source }),
          ...(options?.code && { code: options.code }),
          ...(options?.meta && { meta: options.meta }),
        },
      ],
    };

    super(errorResponse, status);

    this.title = message;
    this.statusCode = status;
    this.source = options?.source;
    this.code = options?.code;
    this.meta = options?.meta;

    // Ensure prototype chain is properly maintained
    Object.setPrototypeOf(this, JsonApiError.prototype);
  }
} 