# @foryourdev/nestjs-jsonapi 패키지 업데이트 가이드

최신 버전(1.1.0)의 패키지를 설치하기 위한 가이드입니다.

## 일반 설치

```bash
npm install @foryourdev/nestjs-jsonapi@latest
```

## 캐시 관련 문제 해결

만약 `npm install @foryourdev/nestjs-jsonapi`로 설치 시 1.0.0 버전이 설치된다면, 다음과 같은 방법을 시도해보세요:

### 1. NPM 캐시 정리 후 설치

```bash
npm cache clean --force
npm install @foryourdev/nestjs-jsonapi@latest
```

### 2. 직접 버전 지정 설치

```bash
npm install @foryourdev/nestjs-jsonapi@1.1.0
```

### 3. package.json에 직접 버전 명시

```json
{
  "dependencies": {
    "@foryourdev/nestjs-jsonapi": "^1.1.0",
    // 기타 의존성...
  }
}
```

그 후 `npm install` 실행

## 설치 후 버전 확인

설치가 완료된 후 다음 명령어로 설치된 버전을 확인할 수 있습니다:

```bash
npm list @foryourdev/nestjs-jsonapi
```

## 버전 정보

### 1.1.0
- 컨트롤러 및 메서드 레벨 필터 및 인클루드 제어 기능 추가
- `@AllowedFilters` 및 `@AllowedIncludes` 데코레이터 추가
- 데코레이터 파일 구조 개선 