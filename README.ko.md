# @foryourdev/nestjs-jsonapi

JSON:API serialization package for NestJS

## 소개

이 패키지는 NestJS 애플리케이션에서 [JSON:API 스펙](https://jsonapi.org/)을 준수하는 응답을 쉽게 생성할 수 있도록 도와줍니다. 데코레이터를 활용한 직관적인 API를 제공하여 복잡한 데이터 구조를 JSON:API 형식으로 간편하게 직렬화할 수 있습니다.

## 지원 기능

- ✅ 기본 리소스 직렬화
- ✅ 필드 필터링 (Sparse Fieldsets)
- ✅ 관계 포함 (Inclusion of Related Resources)
- ✅ 페이지네이션 (Pagination)
  - ✅ 오프셋 기반 (page[number], page[size])
  - ✅ 커서 기반 (page[after], page[before])
- ✅ 정렬 (Sorting)
  - ✅ 단일/다중 필드 정렬
  - ✅ 오름차순/내림차순 지원
- ✅ 필터링 (Filtering)
  - ✅ 단순 필터
  - ✅ 연산자 기반 필터 (gt, lt, gte, lte, in, nin, like 등)

## 설치

```bash
npm install @foryourdev/nestjs-jsonapi
```

## 기본 설정

### 모듈 등록

애플리케이션의 루트 모듈이나 필요한 모듈에 `JsonApiModule`을 임포트합니다:

```typescript
import { Module } from '@nestjs/common';
import { JsonApiModule } from '@foryourdev/nestjs-jsonapi';

@Module({
  imports: [JsonApiModule],
})
export class AppModule {}
```

## 사용 방법

### 1. 직렬화기 정의

데이터 모델에 맞는 직렬화기 클래스를 정의합니다:

```typescript
import { JSONAPISerializer, Attribute, HasMany, BelongsTo } from '@foryourdev/nestjs-jsonapi';

@JSONAPISerializer({
  type: 'articles', // 리소스 타입 (생략 시 클래스 이름 기반으로 자동 생성)
})
export class ArticleSerializer {
  @Attribute()
  title: string;
  
  @Attribute({ name: 'body-text' }) // 속성 이름 변경
  body: string;
  
  @Attribute({
    condition: (article) => article.isPublished, // 조건부 포함
  })
  publishedAt: Date;
  
  @HasMany({ type: 'comments' })
  comments: any[];
  
  @BelongsTo({ type: 'users' })
  author: any;
}
```

### 2. 컨트롤러에서 사용

#### 기본 사용법

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode } from '@nestjs/common';
import { SerializerService } from '@foryourdev/nestjs-jsonapi';
import { ArticleSerializer } from './article.serializer';
import { ArticleService } from './article.service';
import { CreateArticleDto, UpdateArticleDto } from './article.dto';

@Controller('articles')
export class ArticleController {
  constructor(
    private readonly articleService: ArticleService,
    private readonly serializerService: SerializerService,
  ) {}
  
  @Get()
  async index() {
    const articles = await this.articleService.findAll();
    return this.serializerService.serialize(ArticleSerializer, articles);
  }
  
  @Get(':id')
  async show(@Param('id') id: string) {
    const article = await this.articleService.findById(id);
    return this.serializerService.serialize(ArticleSerializer, article);
  }
  
  @Post()
  async create(@Body() createArticleDto: CreateArticleDto) {
    const article = await this.articleService.create(createArticleDto);
    return this.serializerService.serialize(ArticleSerializer, article);
  }
  
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
    const article = await this.articleService.update(id, updateArticleDto);
    return this.serializerService.serialize(ArticleSerializer, article);
  }
  
  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    await this.articleService.delete(id);
    return;
  }
}
```

#### 개선된 사용법 (자동 직렬화)

JSONAPIResponse 데코레이터와 인터셉터를 사용하면 코드 중복을 줄일 수 있습니다:

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode } from '@nestjs/common';
import { JSONAPIResponse } from '@foryourdev/nestjs-jsonapi';
import { ArticleSerializer } from './article.serializer';
import { ArticleService } from './article.service';
import { CreateArticleDto, UpdateArticleDto } from './article.dto';

@Controller('articles')
@JSONAPIResponse({ serializer: ArticleSerializer }) // 컨트롤러 전체에 적용
export class ArticleController {
  constructor(
    private readonly articleService: ArticleService,
  ) {}
  
  @Get()
  async index() {
    return await this.articleService.findAll();
    // 자동으로 ArticleSerializer로 직렬화됨
  }
  
  @Get(':id')
  async show(@Param('id') id: string) {
    return await this.articleService.findById(id);
    // 자동으로 ArticleSerializer로 직렬화됨
  }
  
  @Post()
  async create(@Body() createArticleDto: CreateArticleDto) {
    return await this.articleService.create(createArticleDto);
    // 자동으로 ArticleSerializer로 직렬화됨
  }
  
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
    return await this.articleService.update(id, updateArticleDto);
    // 자동으로 ArticleSerializer로 직렬화됨
  }
  
  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    await this.articleService.delete(id);
    return;
  }
  
  // 메서드별로 다른 직렬화기 사용 가능
  @Get('special')
  @JSONAPIResponse({ serializer: SpecialArticleSerializer })
  async getSpecial() {
    return await this.articleService.findSpecial();
    // SpecialArticleSerializer로 직렬화됨
  }
}
```

## 기능 상세 설명

### 1. 필드 필터링 (Sparse Fieldsets)

클라이언트가 필요한 필드만 선택적으로 받을 수 있습니다:

```typescript
// 컨트롤러 코드
@Get()
async index() {
  const articles = await this.articleService.findAll();
  // 자동으로 쿼리 파라미터를 분석하여 필드 필터링을 적용
  return this.serializerService.serialize(ArticleSerializer, articles);
}
```

클라이언트 요청:
```
GET /articles?fields[articles]=title,body-text
```

응답 예시:
```json
{
  "data": [
    {
      "id": "1",
      "type": "articles",
      "attributes": {
        "title": "첫 번째 글",
        "body-text": "내용..."
      }
    }
  ]
}
```

### 2. 관계 포함 (Inclusion of Related Resources)

관련 리소스를 함께 요청할 수 있습니다:

```typescript
// 컨트롤러 코드는 변경 없이 동일
@Get(':id')
async show(@Param('id') id: string) {
  const article = await this.articleService.findById(id);
  // 자동으로 쿼리 파라미터를 분석하여 관계 포함을 적용
  return this.serializerService.serialize(ArticleSerializer, article);
}
```

클라이언트 요청:
```
GET /articles/1?include=author,comments
```

응답 예시:
```json
{
  "data": {
    "id": "1",
    "type": "articles",
    "attributes": { /* 속성들 */ },
    "relationships": {
      "author": {
        "data": { "type": "users", "id": "1" }
      },
      "comments": {
        "data": [
          { "type": "comments", "id": "1" },
          { "type": "comments", "id": "2" }
        ]
      }
    }
  },
  "included": [
    {
      "id": "1",
      "type": "users",
      "attributes": { /* 사용자 속성들 */ }
    },
    {
      "id": "1",
      "type": "comments",
      "attributes": { /* 코멘트 속성들 */ }
    },
    {
      "id": "2",
      "type": "comments",
      "attributes": { /* 코멘트 속성들 */ }
    }
  ]
}
```

### 3. 페이지네이션 (Pagination)

#### 오프셋 기반 페이지네이션

```typescript
// 컨트롤러 코드는 변경 없이 동일
@Get()
async index() {
  const articles = await this.articleService.findAll();
  // 자동으로 쿼리 파라미터를 분석하여 페이지네이션을 적용
  return this.serializerService.serialize(ArticleSerializer, articles);
}
```

클라이언트 요청:
```
GET /articles?page[number]=2&page[size]=10
```

응답 예시:
```json
{
  "data": [ /* 두 번째 페이지의 10개 항목 */ ],
  "meta": {
    "current_page": 2,
    "from": 11,
    "last_page": 5,
    "per_page": 10,
    "to": 20,
    "total": 48
  },
  "links": {
    "self": "http://example.com/articles?page[number]=2&page[size]=10",
    "first": "http://example.com/articles?page[number]=1&page[size]=10",
    "prev": "http://example.com/articles?page[number]=1&page[size]=10",
    "next": "http://example.com/articles?page[number]=3&page[size]=10",
    "last": "http://example.com/articles?page[number]=5&page[size]=10"
  }
}
```

#### 커서 기반 페이지네이션

클라이언트 요청:
```
GET /articles?page[after]=article:123&page[size]=15
```

응답 예시:
```json
{
  "data": [ /* ID 123 이후의 15개 항목 */ ],
  "meta": {
    "per_page": 15,
    "count": 15,
    "total": 48
  },
  "links": {
    "self": "http://example.com/articles?page[after]=article:123&page[size]=15",
    "next": "http://example.com/articles?page[after]=article:138&page[size]=15",
    "prev": "http://example.com/articles?page[before]=article:123&page[size]=15"
  }
}
```

### 4. 정렬 (Sorting)

여러 필드로 정렬이 가능합니다:

```typescript
// 컨트롤러 코드는 변경 없이 동일
@Get()
async index() {
  const articles = await this.articleService.findAll();
  // 자동으로 쿼리 파라미터를 분석하여 정렬을 적용
  return this.serializerService.serialize(ArticleSerializer, articles);
}
```

클라이언트 요청:
```
GET /articles?sort=-created-at,title
```

이렇게 하면 created-at 필드를 기준으로 내림차순 정렬하고, 같은 값이 있는 경우 title로 오름차순 정렬합니다.

### 5. 필터링 (Filtering)

다양한 필터링 옵션을 제공합니다:

#### 기본 필터
```
GET /articles?filter[category]=technology
```

#### 연산자 기반 필터
```
GET /articles?filter[created-at][gte]=2023-01-01&filter[created-at][lte]=2023-12-31
```

지원되는 연산자:
- `eq`: 같음 (=)
- `ne`: 같지 않음 (!=)
- `gt`: 초과 (>)
- `gte`: 이상 (>=)
- `lt`: 미만 (<)
- `lte`: 이하 (<=)
- `in`: 포함 (IN)
- `nin`: 포함하지 않음 (NOT IN)
- `like`: 부분 일치

예시:
```
GET /articles?filter[status]=published
GET /articles?filter[price][gt]=100
GET /articles?filter[price][lte]=500
GET /articles?filter[tags][in]=javascript,nestjs
GET /articles?filter[title][like]=json
```

### 3. 클라이언트 요청 예제

#### 기본 조회
단일 리소스 조회:
```
GET /articles/1
```

컬렉션 조회:
```
GET /articles
```

#### 필드 필터링 (Sparse Fieldsets)
특정 필드만 포함:
```
GET /articles/1?fields[articles]=title,body-text
```

여러 리소스 타입의 필드 제한:
```
GET /articles/1?include=author&fields[articles]=title,body-text&fields[users]=name,email
```

#### 관계 포함 (Inclusion of Related Resources)
단일 관계 포함:
```
GET /articles/1?include=author
```

여러 관계 포함:
```
GET /articles/1?include=author,comments
```

중첩 관계 포함:
```
GET /articles/1?include=author,comments.author
```

복잡한 관계 포함:
```
GET /articles/1?include=author.profile,comments.author,tags
```

#### 페이지네이션 (Pagination)
오프셋 기반 페이지네이션:
```
GET /articles?page[number]=2&page[size]=10
```

커서 기반 페이지네이션:
```
GET /articles?page[after]=article:123&page[size]=15
```

#### 정렬 (Sorting)
단일 필드 정렬:
```
GET /articles?sort=created-at
```

내림차순 정렬:
```
GET /articles?sort=-created-at
```

여러 필드 정렬:
```
GET /articles?sort=-created-at,title
```

#### 필터링 (Filtering)
기본 필터링:
```
GET /articles?filter[category]=technology
```

다중 값 필터링:
```
GET /articles?filter[tags]=javascript,nestjs
```

범위 필터링:
```
GET /articles?filter[created-at][gte]=2023-01-01&filter[created-at][lte]=2023-12-31
```

#### 복합 요청 예제
모든 기능 조합:
```
GET /articles?include=author.profile,comments.author&fields[articles]=title,body-text&fields[users]=name,avatar&sort=-created-at&page[size]=10&page[number]=2&filter[category]=technology
```

#### curl 예제
```bash
# 기본 조회
curl -X GET "https://api.example.com/articles/1" \
  -H "Accept: application/vnd.api+json"

# 관계 포함 및 필드 제한
curl -X GET "https://api.example.com/articles/1?include=author,comments&fields[articles]=title,body-text" \
  -H "Accept: application/vnd.api+json"

# 데이터 생성
curl -X POST "https://api.example.com/articles" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Accept: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "articles",
      "attributes": {
        "title": "JSON:API 패키지 사용하기",
        "body-text": "이 패키지를 사용하면 간편하게..."
      },
      "relationships": {
        "author": {
          "data": { "type": "users", "id": "1" }
        }
      }
    }
  }'
```

## 고급 기능

### 커스텀 ID 지정

```typescript
@JSONAPISerializer({
  type: 'articles',
  id: (article) => `${article.year}-${article.slug}`, // 커스텀 ID 로직
})
export class ArticleSerializer {
  // ...
}
```

### 다형성 관계 처리

```typescript
@HasMany({
  polymorphic: {
    ImageAttachment: 'images',
    DocumentAttachment: 'documents',
  },
})
attachments: any[];
```

### ORM 통합 (TypeORM)

이 패키지는 TypeORM과의 통합을 지원합니다. 서비스 계층에서 JSON:API 규격의 필터링, 정렬, 페이지네이션을 쉽게 적용할 수 있습니다.

```typescript
// 필수 패키지 설치
// npm install typeorm @nestjs/typeorm

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './article.entity';
import { TypeOrmQueryBuilderService } from '@foryourdev/nestjs-jsonapi';
import { SerializerOptions, buildQueryParams } from '@foryourdev/nestjs-jsonapi';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article)
    private articleRepository: Repository<Article>,
    private queryBuilderService: TypeOrmQueryBuilderService,
  ) {}

  async findAll(options: SerializerOptions): Promise<Article[]> {
    // SerializerOptions에서 쿼리 파라미터 추출
    const { filters, sorts, pagination } = buildQueryParams(options);
    
    // TypeORM 쿼리 빌더 생성
    const queryBuilder = this.queryBuilderService
      .createQueryBuilder(this.articleRepository, 'article')
      .applyFilters(filters)
      .applySorting(sorts)
      .applyPagination(pagination);
    
    // 쿼리 실행
    return queryBuilder.execute<Article>();
  }
  
  async count(options: SerializerOptions): Promise<number> {
    const { filters } = buildQueryParams(options);
    
    const queryBuilder = this.queryBuilderService
      .createQueryBuilder(this.articleRepository, 'article')
      .applyFilters(filters);
    
    return queryBuilder.count();
  }
}
```

### Repository 직접 인터셉트 (서비스 계층 없이)

TypeORM Repository를 직접 인터셉트하여 서비스 계층 없이 JSON:API 쿼리 파라미터를 자동으로 적용할 수 있습니다:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JsonApiModule } from '@foryourdev/nestjs-jsonapi';
import { User } from './entities/user.entity';
import { Post } from './entities/post.entity';
import { UserController } from './controllers/user.controller';
import { PostController } from './controllers/post.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // TypeORM 설정
    }),
    TypeOrmModule.forFeature([User, Post]),
    
    // 기본 사용법 - 모든 필터와 인클루드 허용
    JsonApiModule.forFeature([User]),
    
    // 고급 사용법 - 허용된 필터와 인클루드만 적용
    JsonApiModule.forFeature([
      { 
        entity: Post, 
        options: { 
          // 'title'과 'status' 필드만 필터링 허용
          allowedFilters: ['title', 'status'],
          
          // 'author'와 'comments' 관계만 인클루드 허용
          allowedIncludes: ['author', 'comments']
        } 
      }
    ])
  ],
  controllers: [UserController, PostController],
})
export class AppModule {}
```

```typescript
// user.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { JSONAPIResponse } from '@foryourdev/nestjs-jsonapi';
import { UserSerializer } from '../serializers/user.serializer';

@Controller('users')
@JSONAPIResponse({ serializer: UserSerializer })
export class UserController {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}
  
  @Get()
  async findAll() {
    // 자동으로 JSON:API 쿼리 파라미터 적용됨!
    // 모든 필터와 인클루드가 허용됨
    return await this.userRepository.find();
  }
  
  @Get(':id')
  async findOne(@Param('id') id: number) {
    return await this.userRepository.findOne({ where: { id } });
  }
}
```

```typescript
// post.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../entities/post.entity';
import { JSONAPIResponse } from '@foryourdev/nestjs-jsonapi';
import { PostSerializer } from '../serializers/post.serializer';

@Controller('posts')
@JSONAPIResponse({ serializer: PostSerializer })
export class PostController {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}
  
  @Get()
  async findAll() {
    // 자동으로 JSON:API 쿼리 파라미터 적용됨!
    // allowedFilters와 allowedIncludes 옵션에 따라 제한됨
    // 예: filter[title]=test (허용됨), filter[author]=1 (무시됨)
    return await this.postRepository.find();
  }
}
```

#### 허용된 필터 및 인클루드 적용 예시

1. 클라이언트가 다음과 같은 요청을 보내는 경우:
```
GET /posts?filter[title]=테스트&filter[author]=1&include=author,comments,tags
```

2. `PostController`에서 처리될 때:
   - `filter[title]=테스트`는 허용된 필터이므로 적용됨
   - `filter[author]=1`은 허용되지 않은 필터이므로 무시됨
   - `include=author,comments`는 허용된 인클루드이므로 적용됨
   - `include=tags`는 허용되지 않은 인클루드이므로 무시됨

3. 실제로 적용되는 쿼리:
```
GET /posts?filter[title]=테스트&include=author,comments
```

이 방식을 사용하면:

1. 서비스 계층 없이 컨트롤러에서 바로 Repository를 사용할 수 있습니다.
2. 원래 `find()` 메서드에 자동으로 필터링, 정렬, 페이지네이션이 적용됩니다.
3. 추가 코드나 래퍼 없이 기존 TypeORM 사용 방식을 그대로 유지할 수 있습니다.
4. 엔티티별로 허용된 필터와 인클루드를 세밀하게 제어할 수 있습니다.

## API 참조

### 데코레이터

- `@JSONAPISerializer(options)` - 클래스를 JSON:API 직렬화기로 정의
- `@Attribute(options)` - 속성 정의
- `@HasMany(options)` - 일대다 관계 정의
- `@HasOne(options)` - 일대일 관계 정의
- `@BelongsTo(options)` - 종속 관계 정의
- `@JSONAPIResponse(options)` - 컨트롤러/메서드에 자동 직렬화 적용

### 서비스

- `SerializerService` - 데이터 직렬화를 처리하는 주요 서비스
- `SerializerRegistry` - 직렬화기 등록 및 관리

## 라이센스

MIT

---

## 문서화 및 기여

더 자세한 정보와 API 문서는 [GitHub 저장소](https://github.com/foryourdev/nestjs-jsonapi)를 참조하세요.

이슈 및 풀 리퀘스트는 언제나 환영합니다! 