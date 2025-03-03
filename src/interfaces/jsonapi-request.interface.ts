/**
 * JSON:API 요청 본문 인터페이스
 * https://jsonapi.org/format/#crud 참조
 */
export interface JsonApiRequestBody {
  /**
   * 자원 타입
   */
  type: string;
  
  /**
   * 자원 ID (업데이트 및 관계 요청에 필요)
   */
  id?: string;
  
  /**
   * 자원 속성
   */
  attributes?: Record<string, any>;
  
  /**
   * 자원 관계
   */
  relationships?: Record<string, {
    data: {
      type: string;
      id: string;
    } | Array<{
      type: string;
      id: string;
    }> | null;
  }>;
}

/**
 * JSON:API 요청 데이터 인터페이스
 */
export interface JsonApiRequest {
  /**
   * 요청 데이터
   */
  data: JsonApiRequestBody | JsonApiRequestBody[];
  
  /**
   * 포함된 자원 데이터 (복합 문서)
   */
  included?: Array<{
    type: string;
    id: string;
    attributes?: Record<string, any>;
    relationships?: Record<string, any>;
  }>;
}

/**
 * JSON:API 요청에서 변환된 일반 DTO 형식
 */
export interface TransformedRequestData {
  /**
   * 원본 ID
   */
  id?: string;
  
  /**
   * 원본 타입
   */
  _type?: string;
  
  /**
   * 변환된 속성 및 관계
   */
  [key: string]: any;
} 