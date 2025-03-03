import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { JsonApiError } from './json-api.error';

/**
 * JSON:API Exception Filter
 * 
 * This filter transforms all exceptions into JSON:API compliant error responses.
 * It specifically handles JsonApiError instances to preserve their custom fields,
 * and transforms other HttpExceptions into the JSON:API format.
 */
@Catch()
export class JsonApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    // Default to a 500 internal server error if not an HttpException
    let status = 500;
    let errorResponse: { errors: Array<{ status: string; title: string; detail?: string }> } = {
      errors: [
        {
          status: '500',
          title: 'Internal Server Error',
          detail: 'An unexpected error occurred'
        }
      ]
    };

    if (exception instanceof JsonApiError) {
      // JsonApiError already has the correct format, so we can return it directly
      return response
        .status(exception.getStatus())
        .json(exception.getResponse());
    } else if (exception instanceof HttpException) {
      // For other HttpExceptions, transform them to JSON:API format
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      // Format the error response based on exceptionResponse structure
      if (typeof exceptionResponse === 'object') {
        const message = (exceptionResponse as any).message || 'An error occurred';
        const detail = (exceptionResponse as any).error || null;
        
        errorResponse = {
          errors: [
            {
              status: status.toString(),
              title: Array.isArray(message) ? message[0] : message,
              ...(detail && { detail }),
            }
          ]
        };
      } else {
        errorResponse = {
          errors: [
            {
              status: status.toString(),
              title: exceptionResponse as string,
            }
          ]
        };
      }
    } else if (exception instanceof Error) {
      // For general JavaScript errors, provide a generic response
      errorResponse = {
        errors: [
          {
            status: status.toString(),
            title: 'Internal Server Error',
            detail: exception.message,
          }
        ]
      };
    }

    response.status(status).json(errorResponse);
  }
} 