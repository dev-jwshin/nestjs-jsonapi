# 변경사항

## 컨트롤러 및 메서드 레벨의 필터 및 인클루드 제어 기능 추가

### 추가된 파일
- `src/decorators/allowed-filters.decorator.ts`: 새로운 `@AllowedFilters` 데코레이터 구현
- `src/decorators/allowed-includes.decorator.ts`: 새로운 `@AllowedIncludes` 데코레이터 구현
- `src/interceptors/filters-includes.interceptor.ts`: 데코레이터를 처리하는 인터셉터 구현

### 수정된 파일
- `src/decorators/index.ts`: 새로운 데코레이터 export
- `src/json-api.module.ts`: FiltersIncludesInterceptor 등록
- `src/services/serializer.service.ts`: 데코레이터 설정 적용 로직 추가
- `src/interceptors/index.ts`: 새로운 인터셉터 export
- `src/index.ts`: 새로운 기능 export
- `README.md` & `README.ko.md`: 새로운 기능 문서화

### 기능
1. `@AllowedFilters(['field1', 'field2', ...])`: 컨트롤러 또는 메서드에서 허용할 필터 필드 설정
2. `@AllowedIncludes(['relation1', 'relation2', ...])`: 컨트롤러 또는 메서드에서 허용할 인클루드 관계 설정

### 우선순위
- 메서드 레벨 데코레이터가 컨트롤러 레벨 데코레이터보다 우선
- 메서드에 데코레이터가 없으면 컨트롤러 레벨 설정 상속

## 기능 분리

### 파일 구조 변경
- `src/decorators/filters-includes.decorator.ts` 파일을 삭제하고 두 개의 파일로 분리:
  - `src/decorators/allowed-filters.decorator.ts`: AllowedFilters 데코레이터 구현
  - `src/decorators/allowed-includes.decorator.ts`: AllowedIncludes 데코레이터 구현

### 수정된 파일
- `src/decorators/index.ts`: 분리된 데코레이터 파일 import 경로 수정
- `src/interceptors/filters-includes.interceptor.ts`: import 경로 수정
- `src/index.ts`: 분리된 데코레이터 파일 import 경로 수정 