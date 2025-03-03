import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { JsonApiRequest } from '../interfaces/jsonapi-request.interface';
import { JsonApiRequestTransformerService } from '../services/jsonapi-request-transformer.service';

@Injectable()
export class JsonApiRequestPipe implements PipeTransform {
  constructor(
    private readonly transformerService: JsonApiRequestTransformerService
  ) {}

  /**
   * JSON:API 요청을 표준 DTO 형식으로 변환
   * @param value 요청 데이터
   * @param metadata 메타데이터
   * @returns 변환된 데이터
   */
  transform(value: any, metadata: ArgumentMetadata) {
    // JSON:API 요청 형식인지 확인
    if (!this.isJsonApiRequest(value)) {
      throw new BadRequestException('요청이 JSON:API 형식이 아닙니다.');
    }

    // 변환 옵션 설정
    const resourceType = metadata.metatype?.prototype?.resourceType;
    
    // 변환 실행
    return this.transformerService.transformRequest(value, resourceType);
  }

  /**
   * JSON:API 요청 형식인지 검증
   * @param value 요청 데이터
   * @returns 유효성 여부
   */
  private isJsonApiRequest(value: any): value is JsonApiRequest {
    if (!value || typeof value !== 'object') {
      return false;
    }
    
    // 데이터 필드 존재 확인
    if (!value.data) {
      return false;
    }
    
    // 단일 데이터 검증
    if (!Array.isArray(value.data)) {
      return this.isValidResourceObject(value.data);
    }
    
    // 배열 데이터 검증
    if (value.data.length === 0) {
      return true; // 빈 배열 허용
    }
    
    // 모든 배열 항목 검증
    return value.data.every(item => this.isValidResourceObject(item));
  }
  
  /**
   * 자원 객체 유효성 검증
   * @param item 검증할 자원 객체
   * @returns 유효성 여부
   */
  private isValidResourceObject(item: any): boolean {
    if (!item || typeof item !== 'object') {
      return false;
    }
    
    // 필수 필드인 타입 확인
    if (!item.type || typeof item.type !== 'string') {
      return false;
    }
    
    // 속성 또는 관계 중 하나 이상 존재해야 함
    return (
      (item.attributes && typeof item.attributes === 'object') ||
      (item.relationships && typeof item.relationships === 'object')
    );
  }
} 