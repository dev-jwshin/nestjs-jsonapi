export interface SerializerOptions {
  include?: string[];
  fields?: Record<string, string[]>;
  params?: Record<string, any>;
  // 요청 객체
  request?: any;
  // 페이지네이션
  pagination?: {
    number?: number;
    size?: number;
    after?: string;
    before?: string;
    // 총 개수를 응답에 포함할지 여부 (기본값: true)
    count?: boolean;
  };
  // 정렬
  sort?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  // 필터링
  filter?: Record<string, any>;
}

// 응답에 포함될 페이지네이션 메타 데이터
export interface PaginationMeta {
  current_page?: number;
  from?: number;
  last_page?: number;
  per_page?: number;
  to?: number;
  total?: number;
  count?: number;
}

// 응답에 포함될 링크 데이터
export interface PaginationLinks {
  first?: string;
  last?: string;
  prev?: string;
  next?: string;
  self: string;
}

export interface SerializerMetadataOptions {
  type?: string;
  id?: string | ((record: any, params?: any) => string);
  attributes?: string[];
}

export interface AttributeMetadata {
  property: string;
  name: string;
  condition?: (record: any, params?: any) => boolean;
}

export interface RelationshipMetadata {
  property: string;
  name: string;
  type: 'hasMany' | 'hasOne' | 'belongsTo';
  resourceType?: string;
  serializer?: any;
  condition?: (record: any, params?: any) => boolean;
  idMethodName?: string;
  polymorphic?: boolean | Record<string, string>;
}

export interface ResourceObject {
  id: string;
  type: string;
  attributes?: Record<string, any>;
  relationships?: Record<string, { data: any }>;
} 