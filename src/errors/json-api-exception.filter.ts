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
    let errorResponse: { errors: Array<{ status: string; title: string; detail?: string; source?: any }> } = {
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
        
        if (Array.isArray(message)) {
          // 유효성 검사 오류가 배열인 경우 모든 오류를 포함
          errorResponse = {
            errors: message.map(msg => {
              // 유효성 검사 오류 메시지에서 필드 정보 추출 시도
              let source = undefined;
              let title = msg;
              
              // class-validator 오류 메시지에서 필드 정보 추출 시도
              // 일반적인 형식: "property [fieldName] message"
              const propertyMatch = msg.match(/^([a-zA-Z0-9_]+) (.+)$/);
              if (propertyMatch) {
                source = { pointer: `/data/attributes/${propertyMatch[1]}` };
                title = propertyMatch[2];
              }
              
              return {
                status: status.toString(),
                title: title,
                ...(source && { source }),
                ...(detail && { detail }),
              };
            })
          };
        } else {
          // 단일 오류 메시지인 경우
          errorResponse = {
            errors: [
              {
                status: status.toString(),
                title: message,
                ...(detail && { detail }),
              }
            ]
          };
        }
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