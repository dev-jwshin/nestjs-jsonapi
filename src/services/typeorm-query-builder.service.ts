import { Injectable } from '@nestjs/common';
import type { Repository, SelectQueryBuilder } from 'typeorm';
import { QueryBuilderInterface, QueryFilter, QueryPagination, QuerySort } from '../interfaces/query-builder.interface';

/**
 * TypeORM용 쿼리 빌더 서비스
 */
@Injectable()
export class TypeOrmQueryBuilderService {
  /**
   * TypeORM 리포지토리에 대한 쿼리 빌더 생성
   * @param repository TypeORM 리포지토리
   * @param alias 테이블 별칭
   * @returns 쿼리 빌더 인터페이스
   */
  createQueryBuilder<T>(repository: Repository<T>, alias: string): QueryBuilderInterface {
    const queryBuilder = repository.createQueryBuilder(alias);
    return new TypeOrmQueryBuilder<T>(queryBuilder, alias);
  }
}

/**
 * TypeORM용 쿼리 빌더 구현체
 */
class TypeOrmQueryBuilder<T> implements QueryBuilderInterface {
  constructor(
    private queryBuilder: SelectQueryBuilder<T>,
    private alias: string,
  ) {}

  /**
   * 필터 조건 적용
   * @param filter 필터 조건
   */
  applyFilter(filter: QueryFilter): this {
    const { field, operator, value } = filter;
    const paramName = `${field}${Date.now()}`;
    const columnPath = `${this.alias}.${field}`;

    switch (operator) {
      case 'eq':
        this.queryBuilder.andWhere(`${columnPath} = :${paramName}`, { [paramName]: value });
        break;
      case 'ne':
        this.queryBuilder.andWhere(`${columnPath} != :${paramName}`, { [paramName]: value });
        break;
      case 'gt':
        this.queryBuilder.andWhere(`${columnPath} > :${paramName}`, { [paramName]: value });
        break;
      case 'gte':
        this.queryBuilder.andWhere(`${columnPath} >= :${paramName}`, { [paramName]: value });
        break;
      case 'lt':
        this.queryBuilder.andWhere(`${columnPath} < :${paramName}`, { [paramName]: value });
        break;
      case 'lte':
        this.queryBuilder.andWhere(`${columnPath} <= :${paramName}`, { [paramName]: value });
        break;
      case 'in':
        const inValues = Array.isArray(value) ? value : String(value).split(',');
        this.queryBuilder.andWhere(`${columnPath} IN (:...${paramName})`, { [paramName]: inValues });
        break;
      case 'nin':
        const notInValues = Array.isArray(value) ? value : String(value).split(',');
        this.queryBuilder.andWhere(`${columnPath} NOT IN (:...${paramName})`, { [paramName]: notInValues });
        break;
      case 'like':
        this.queryBuilder.andWhere(`${columnPath} LIKE :${paramName}`, { [paramName]: `%${value}%` });
        break;
    }

    return this;
  }

  /**
   * 여러 필터 조건 적용
   * @param filters 필터 조건 배열
   */
  applyFilters(filters: QueryFilter[]): this {
    filters.forEach(filter => this.applyFilter(filter));
    return this;
  }

  /**
   * 정렬 적용
   * @param sorts 정렬 조건 배열
   */
  applySorting(sorts: QuerySort[]): this {
    sorts.forEach(({ field, direction }) => {
      this.queryBuilder.addOrderBy(`${this.alias}.${field}`, direction.toUpperCase() as 'ASC' | 'DESC');
    });
    return this;
  }

  /**
   * 페이지네이션 적용
   * @param pagination 페이지네이션 설정
   */
  applyPagination(pagination: QueryPagination): this {
    // 오프셋 기반 페이지네이션
    if (pagination.page !== undefined && pagination.perPage !== undefined) {
      const skip = (pagination.page - 1) * pagination.perPage;
      this.queryBuilder.skip(skip).take(pagination.perPage);
    }
    // 커서 기반 페이지네이션
    else if (pagination.afterCursor || pagination.beforeCursor) {
      const cursorField = pagination.cursorField || 'id';
      const perPage = pagination.perPage || 10;

      if (pagination.afterCursor) {
        this.queryBuilder.andWhere(`${this.alias}.${cursorField} > :afterCursor`, { 
          afterCursor: pagination.afterCursor 
        });
        this.queryBuilder.orderBy(`${this.alias}.${cursorField}`, 'ASC');
        this.queryBuilder.take(perPage);
      } else if (pagination.beforeCursor) {
        this.queryBuilder.andWhere(`${this.alias}.${cursorField} < :beforeCursor`, { 
          beforeCursor: pagination.beforeCursor 
        });
        this.queryBuilder.orderBy(`${this.alias}.${cursorField}`, 'DESC');
        this.queryBuilder.take(perPage);
        
        // 클라이언트에게 올바른 순서로 결과를 반환하기 위해 실행 후 결과를 뒤집어야 함
        // 이는 execute() 메서드에서 처리됨
      }
    }

    return this;
  }

  /**
   * 쿼리 실행 및 결과 반환
   */
  async execute<R>(): Promise<R[]> {
    const result = await this.queryBuilder.getMany() as unknown as R[];
    
    // 커서 기반 페이지네이션에서 before 커서를 사용한 경우, 결과를 뒤집어야 함
    if (this.queryBuilder.expressionMap.orderBys) {
      const orderByEntries = Object.entries(this.queryBuilder.expressionMap.orderBys);
      if (orderByEntries.length > 0) {
        const [orderByField, orderByDirection] = orderByEntries[0];
        if (orderByField.includes('.') && orderByDirection === 'DESC') {
          result.reverse();
        }
      }
    }
    
    return result;
  }

  /**
   * 총 개수 조회
   */
  async count(): Promise<number> {
    return this.queryBuilder.getCount();
  }
} 