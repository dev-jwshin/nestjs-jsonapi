import { Injectable } from '@nestjs/common';
import { JsonApiRequest, JsonApiRequestBody, TransformedRequestData } from '../interfaces/jsonapi-request.interface';
import { SerializerRegistry } from './serializer-registry.service';

@Injectable()
export class JsonApiRequestTransformerService {
  constructor(private readonly serializerRegistry: SerializerRegistry) {}

  /**
   * JSON:API 요청 데이터를 일반 DTO 형식으로 변환
   * @param jsonApiRequest JSON:API 요청 데이터
   * @param resourceType 자원 타입 (옵션)
   * @returns 변환된 일반 객체
   */
  transformRequest(jsonApiRequest: JsonApiRequest, resourceType?: string): TransformedRequestData | TransformedRequestData[] {
    if (!jsonApiRequest || !jsonApiRequest.data) {
      return null;
    }

    // 배열 데이터 처리
    if (Array.isArray(jsonApiRequest.data)) {
      return jsonApiRequest.data.map(item => this.transformRequestBody(item, resourceType));
    }

    // 단일 데이터 처리
    return this.transformRequestBody(jsonApiRequest.data, resourceType);
  }

  /**
   * JSON:API 요청 본문 항목을 변환
   * @param requestBody JSON:API 요청 본문
   * @param resourceType 자원 타입 (옵션)
   * @returns 변환된 일반 객체
   */
  private transformRequestBody(requestBody: JsonApiRequestBody, resourceType?: string): TransformedRequestData {
    if (!requestBody) {
      return null;
    }

    // 타입이 예상과 다를 경우 확인
    if (resourceType && requestBody.type !== resourceType) {
      console.warn(`요청 타입 불일치: 예상=${resourceType}, 실제=${requestBody.type}`);
    }

    const result: TransformedRequestData = {
      _type: requestBody.type,
    };

    // ID 처리
    if (requestBody.id) {
      result.id = requestBody.id;
    }

    // 속성 처리
    if (requestBody.attributes) {
      Object.assign(result, requestBody.attributes);
    }

    // 관계 처리
    if (requestBody.relationships) {
      Object.entries(requestBody.relationships).forEach(([relationName, relationship]) => {
        if (!relationship.data) {
          result[relationName] = null;
          return;
        }

        if (Array.isArray(relationship.data)) {
          // 다대다 관계 (hasMany)
          result[relationName] = relationship.data.map(item => item.id);
        } else {
          // 일대일 관계 (hasOne/belongsTo)
          result[relationName] = relationship.data.id;
        }
      });
    }

    return result;
  }

  /**
   * 자원 타입 네이밍 규칙에 따른 속성 변환
   * 예: 'user-profiles' -> 'userProfiles'
   * @param dashedName 대시로 구분된 이름
   * @returns 캐멀 케이스 이름
   */
  private dashedToCamelCase(dashedName: string): string {
    return dashedName.replace(/-([a-z])/g, g => g[1].toUpperCase());
  }
} 