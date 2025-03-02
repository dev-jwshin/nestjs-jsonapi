# 테스트 환경에서 JSON:API 필터 사용하기

## 문제 해결 요약

JSON:API 패키지의 필터 기능이 실제 애플리케이션에서는 작동하지만 테스트 환경에서 작동하지 않는 문제를 수정했습니다.

```TypeError: Cannot read properties of undefined (reading 'get')
    at FiltersIncludesInterceptor.intercept
```

핵심 문제는 `AsyncLocalStorage`와 REQUEST 스코프 처리 방식의 차이였습니다.

## 변경 사항

1. **요청 컨텍스트 처리 개선**
   - `RequestContextService`를 AsyncLocalStorage 대신 NestJS REQUEST 스코프로 변경
   - `FiltersIncludesInterceptor`를 수정하여 컨텍스트에서 직접 요청 객체를 가져오도록 개선
   - `SerializerService`에서 요청 객체를 직접 주입받도록 변경

2. **테스트 환경 강화**
   - REQUEST 프로바이더를 모킹하여 테스트에서 주입 문제 해결
   - 테스트 설정에 필요한 헤더와 accept 타입 지정
   - 오류 처리 및 디버깅 개선

## 사용 방법

### 1. 테스트 초기화 설정

테스트 환경에서는 다음과 같이 REQUEST 모킹을 설정해야 합니다:

```typescript
// test/test-utils.ts
Test.createTestingModule({
  imports: [AppModule],
})
.overrideProvider(REQUEST)
.useValue({
  query: {},
  params: {},
  headers: {},
  body: {},
})
.compile();
```

### 2. API 요청에 JSON:API 헤더 설정

테스트 요청에 적절한 헤더를 설정하세요:

```typescript
// 자동으로 헤더 설정 (test-utils.ts에 구현)
req = req.set('Accept', 'application/vnd.api+json');

// POST 요청 시 Content-Type 설정
if (method === 'post') {
  req = req.set('Content-Type', 'application/vnd.api+json');
}
```

### 3. 필터 파라미터 사용법

다음과 같이 필터를 사용할 수 있습니다:

```typescript
// 단일 필터
const response = await api().get('/api/v1/users', {
  query: {
    "filter[name]": "테스트",
  },
});

// 복합 필터
const response = await api().get('/api/v1/users', {
  query: {
    "filter[name]": "테스트",
    "filter[email][like]": "test@example.com",
  },
});
```

## 제한 사항

- 테스트 환경에서는 컨트롤러에 `@AllowedFilters` 데코레이터가 제대로 설정되어 있어야 필터가 작동합니다.
- 엔티티를 정확히 등록하고, JsonApiModule.forFeature()에 올바르게 설정해야 합니다.
- 필터 값이 실제 데이터에 없으면 빈 결과가 반환됩니다 (예상대로 작동).

## 디버깅 지침

필터가 여전히 작동하지 않는 경우:

1. 테스트 로그 확인
   ```typescript
   // 테스트 내에서
   console.log(response.body); // 응답 확인
   ```

2. 초기화 확인
   ```typescript
   beforeAll(async () => {
     await initializeApp(); // 앱 초기화 확인
   });
   ```

3. 데이터 확인
   ```typescript
   beforeEach(async () => {
     // 테스트용 데이터 생성 확인
     const users = await UserFactory.createManyAndSave(10); 
     console.log("생성된 테스트 데이터:", users);
   });
   ``` 