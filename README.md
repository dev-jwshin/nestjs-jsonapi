# @foryourdev/nestjs-jsonapi

JSON:API serialization package for NestJS

## Introduction

This package helps you easily generate responses compliant with the [JSON:API specification](https://jsonapi.org/) in NestJS applications. It provides an intuitive API using decorators to simplify the serialization of complex data structures into JSON:API format.

## Supported Features

- ✅ Basic resource serialization
- ✅ Sparse Fieldsets
- ✅ Inclusion of Related Resources
- ✅ Pagination
  - ✅ Offset-based (page[number], page[size])
  - ✅ Cursor-based (page[after], page[before])
- ✅ Sorting
  - ✅ Single/multiple field sorting
  - ✅ Ascending/descending support
- ✅ Filtering
  - ✅ Simple filters
  - ✅ Operator-based filters (gt, lt, gte, lte, in, nin, like, etc.)

## Installation

```bash
npm install @foryourdev/nestjs-jsonapi@latest
```

## Basic Setup

### Module Registration

Import `JsonApiModule` in your application's root module or any other required module:

```typescript
import { Module } from '@nestjs/common';
import { JsonApiModule } from '@foryourdev/nestjs-jsonapi';

@Module({
  imports: [JsonApiModule],
})
export class AppModule {}
```

## Usage

### 1. Define Serializers

Define serializer classes that match your data models:

```typescript
import { JSONAPISerializer, Attribute, HasMany, BelongsTo } from '@foryourdev/nestjs-jsonapi';

@JSONAPISerializer({
  type: 'articles', // Resource type (auto-generated based on class name if omitted)
})
export class ArticleSerializer {
  @Attribute()
  title: string;
  
  @Attribute({ name: 'body-text' }) // Rename attribute
  body: string;
  
  @Attribute({
    condition: (article) => article.isPublished, // Conditional inclusion
  })
  publishedAt: Date;
  
  @HasMany({ type: 'comments' })
  comments: any[];
  
  @BelongsTo({ type: 'users' })
  author: any;
}
```

### 2. Use in Controllers

#### Basic Usage

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

#### Improved Usage (Automatic Serialization)

Use the JSONAPIResponse decorator and interceptor to reduce code duplication:

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode } from '@nestjs/common';
import { JSONAPIResponse } from '@foryourdev/nestjs-jsonapi';
import { ArticleSerializer } from './article.serializer';
import { ArticleService } from './article.service';
import { CreateArticleDto, UpdateArticleDto } from './article.dto';

@Controller('articles')
@JSONAPIResponse({ serializer: ArticleSerializer }) // Applied to the entire controller
export class ArticleController {
  constructor(
    private readonly articleService: ArticleService,
  ) {}
  
  @Get()
  async index() {
    return await this.articleService.findAll();
    // Automatically serialized with ArticleSerializer
  }
  
  @Get(':id')
  async show(@Param('id') id: string) {
    return await this.articleService.findById(id);
    // Automatically serialized with ArticleSerializer
  }
  
  @Post()
  async create(@Body() createArticleDto: CreateArticleDto) {
    return await this.articleService.create(createArticleDto);
    // Automatically serialized with ArticleSerializer
  }
  
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateArticleDto: UpdateArticleDto) {
    return await this.articleService.update(id, updateArticleDto);
    // Automatically serialized with ArticleSerializer
  }
  
  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string) {
    await this.articleService.delete(id);
    return;
  }
  
  // Different serializer can be used for specific methods
  @Get('special')
  @JSONAPIResponse({ serializer: SpecialArticleSerializer })
  async getSpecial() {
    return await this.articleService.findSpecial();
    // Serialized with SpecialArticleSerializer
  }
}
```

## Detailed Feature Description

### 1. Sparse Fieldsets

Clients can selectively receive only the fields they need:

```typescript
// Controller code
@Get()
async index() {
  const articles = await this.articleService.findAll();
  // Query parameters are automatically parsed and field filtering is applied
  return this.serializerService.serialize(ArticleSerializer, articles);
}
```

Client request:
```
GET /articles?fields[articles]=title,body-text
```

Example response:
```json
{
  "data": [
    {
      "id": "1",
      "type": "articles",
      "attributes": {
        "title": "First Article",
        "body-text": "Content..."
      }
    }
  ]
}
```

### 2. Inclusion of Related Resources

Related resources can be requested together:

```typescript
// Controller code remains the same
@Get(':id')
async show(@Param('id') id: string) {
  const article = await this.articleService.findById(id);
  // Query parameters are automatically parsed and relationship inclusion is applied
  return this.serializerService.serialize(ArticleSerializer, article);
}
```

Client request:
```
GET /articles/1?include=author,comments
```

Example response:
```json
{
  "data": {
    "id": "1",
    "type": "articles",
    "attributes": { /* attributes */ },
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
      "attributes": { /* user attributes */ }
    },
    {
      "id": "1",
      "type": "comments",
      "attributes": { /* comment attributes */ }
    },
    {
      "id": "2",
      "type": "comments",
      "attributes": { /* comment attributes */ }
    }
  ]
}
```

### 3. Pagination

#### Offset-based Pagination

```typescript
// Controller code remains unchanged
@Get()
async index() {
  const articles = await this.articleService.findAll();
  // Query parameters are automatically parsed and pagination is applied
  return this.serializerService.serialize(ArticleSerializer, articles);
}
```

Client request:
```
GET /articles?page[number]=2&page[size]=10
```

Example response:
```json
{
  "data": [ /* 10 items from the second page */ ],
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

#### Cursor-based Pagination

Client request:
```
GET /articles?page[after]=article:123&page[size]=15
```

Example response:
```json
{
  "data": [ /* 15 items after ID 123 */ ],
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

### 4. Sorting

You can sort by multiple fields:

```typescript
// Controller code remains the same
@Get()
async index() {
  const articles = await this.articleService.findAll();
  // Query parameters are automatically parsed and sorting is applied
  return this.serializerService.serialize(ArticleSerializer, articles);
}
```

Client request:
```
GET /articles?sort=-created-at,title
```

This sorts by created-at in descending order and then by title in ascending order when there are equal created-at values.

### 5. Filtering

Various filtering options are provided:

#### Basic Filters
```
GET /articles?filter[category]=technology
```

#### Operator-based Filters
```
GET /articles?filter[created-at][gte]=2023-01-01&filter[created-at][lte]=2023-12-31
```

Supported operators:
- `eq`: Equal (=)
- `ne`: Not equal (!=)
- `gt`: Greater than (>)
- `gte`: Greater than or equal (>=)
- `lt`: Less than (<)
- `lte`: Less than or equal (<=)
- `in`: In (IN)
- `nin`: Not in (NOT IN)
- `like`: Partial match

Examples:
```
GET /articles?filter[status]=published
GET /articles?filter[price][gt]=100
GET /articles?filter[price][lte]=500
GET /articles?filter[tags][in]=javascript,nestjs
GET /articles?filter[title][like]=json
```

### Client Request Examples

#### Basic Retrieval
Single resource:
```
GET /articles/1
```

Collection:
```
GET /articles
```

#### Sparse Fieldsets
Include specific fields:
```
GET /articles/1?fields[articles]=title,body-text
```

Limit fields for multiple resource types:
```
GET /articles/1?include=author&fields[articles]=title,body-text&fields[users]=name,email
```

#### Including Related Resources
Include a single relationship:
```GET /articles/1?include=author
```

Include multiple relationships:
```
GET /articles/1?include=author,comments
```

Include nested relationships:
```
GET /articles/1?include=author,comments.author
```

Include complex relationships:
```
GET /articles/1?include=author.profile,comments.author,tags
```

#### Pagination
Offset-based pagination:
```
GET /articles?page[number]=2&page[size]=10
```

Cursor-based pagination:
```
GET /articles?page[after]=article:123&page[size]=15
```

#### Sorting
Single field sorting:
```
GET /articles?sort=created-at
```

Descending order:
```
GET /articles?sort=-created-at
```

Multiple field sorting:
```
GET /articles?sort=-created-at,title
```

#### Filtering
Basic filtering:
```
GET /articles?filter[category]=technology
```

Multi-value filtering:
```
GET /articles?filter[tags]=javascript,nestjs
```

Range filtering:
```
GET /articles?filter[created-at][gte]=2023-01-01&filter[created-at][lte]=2023-12-31
```

#### Complex Request Example
Combining all features:
```
GET /articles?include=author.profile,comments.author&fields[articles]=title,body-text&fields[users]=name,avatar&sort=-created-at&page[size]=10&page[number]=2&filter[category]=technology
```

#### curl Examples
```bash
# Basic retrieval
curl -X GET "https://api.example.com/articles/1" \
  -H "Accept: application/vnd.api+json"

# Including relationships and limiting fields
curl -X GET "https://api.example.com/articles/1?include=author,comments&fields[articles]=title,body-text" \
  -H "Accept: application/vnd.api+json"

# Creating data
curl -X POST "https://api.example.com/articles" \
  -H "Content-Type: application/vnd.api+json" \
  -H "Accept: application/vnd.api+json" \
  -d '{
    "data": {
      "type": "articles",
      "attributes": {
        "title": "Using the JSON:API Package",
        "body-text": "This package makes it easy to..."
      },
      "relationships": {
        "author": {
          "data": { "type": "users", "id": "1" }
        }
      }
    }
  }'
```

## Advanced Features

### Custom ID Specification

```typescript
@JSONAPISerializer({
  type: 'articles',
  id: (article) => `${article.year}-${article.slug}`, // Custom ID logic
})
export class ArticleSerializer {
  // ...
}
```

### Polymorphic Relationships

```typescript
@HasMany({
  polymorphic: {
    ImageAttachment: 'images',
    DocumentAttachment: 'documents',
  },
})
attachments: any[];
```

### ORM Integration (TypeORM)

This package supports integration with TypeORM. You can easily apply JSON:API-compliant filtering, sorting, and pagination in your service layer:

```typescript
// Required packages to install
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
    // Extract query parameters from SerializerOptions
    const { filters, sorts, pagination } = buildQueryParams(options);
    
    // Create TypeORM query builder
    const queryBuilder = this.queryBuilderService
      .createQueryBuilder(this.articleRepository, 'article')
      .applyFilters(filters)
      .applySorting(sorts)
      .applyPagination(pagination);
    
    // Execute query
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

### Direct Repository Interception (Without Service Layer)

You can directly intercept TypeORM Repository to automatically apply JSON:API query parameters without using a service layer:

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
      // TypeORM configuration
    }),
    TypeOrmModule.forFeature([User, Post]),
    
    // Basic usage - allow all filters and includes
    JsonApiModule.forFeature([User]),
    
    // Advanced usage - apply only allowed filters and includes
    JsonApiModule.forFeature([
      { 
        entity: Post, 
        options: { 
          // Only allow filtering by 'title' and 'status' fields
          allowedFilters: ['title', 'status'],
          
          // Only allow including 'author' and 'comments' relationships
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
    // JSON:API query parameters are automatically applied!
    // All filters and includes are allowed
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
    // JSON:API query parameters are automatically applied!
    // Limited by allowedFilters and allowedIncludes options
    // Example: filter[title]=test (allowed), filter[author]=1 (ignored)
    return await this.postRepository.find();
  }
}
```

#### Example of Allowed Filters and Includes Application

1. When a client sends the following request:
```
GET /posts?filter[title]=test&filter[author]=1&include=author,comments,tags
```

2. When processed in `PostController`:
   - `filter[title]=test` is allowed and applied
   - `filter[author]=1` is not allowed and ignored
   - `include=author,comments` is allowed and applied
   - `include=tags` is not allowed and ignored

3. The query that is actually applied:
```
GET /posts?filter[title]=test&include=author,comments
```

Using this approach:

1. You can use Repository directly in controllers without a service layer.
2. The original `find()` method automatically applies filtering, sorting, and pagination.
3. You can maintain the original TypeORM usage pattern without additional wrappers.
4. You can finely control allowed filters and includes per entity.

### 3. Controller-Level and Method-Level Control of Filters and Includes

In addition to module-level configuration, you can use decorators to control allowed filters and includes at the controller and method levels:

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from '../entities/post.entity';
import { JSONAPIResponse, AllowedFilters, AllowedIncludes } from '@foryourdev/nestjs-jsonapi';
import { PostSerializer } from '../serializers/post.serializer';

@Controller('posts')
@JSONAPIResponse({ serializer: PostSerializer })
@AllowedFilters(['title', 'status', 'createdAt']) // Applied to all methods in controller
@AllowedIncludes(['author', 'comments']) // Applied to all methods in controller
export class PostController {
  constructor(
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
  ) {}
  
  @Get()
  async findAll() {
    return await this.postRepository.find();
  }
  
  @Get('featured')
  @AllowedFilters(['title', 'viewCount']) // Overrides controller-level settings
  @AllowedIncludes(['author']) // Overrides controller-level settings
  async findFeatured() {
    return await this.postRepository.find({ where: { featured: true } });
  }
}
```

#### Decorator Priority

- Method-level decorators take precedence over controller-level decorators
- If a method has its own `@AllowedFilters` or `@AllowedIncludes` decorators, they completely override the controller-level settings
- If a method doesn't have these decorators, it inherits the controller-level settings

## API Reference

### Decorators

- `@JSONAPISerializer(options)` - Define a class as a JSON:API serializer
- `@Attribute(options)` - Define an attribute
- `@HasMany(options)` - Define a one-to-many relationship
- `@HasOne(options)` - Define a one-to-one relationship
- `@BelongsTo(options)` - Define a belongs-to relationship
- `@JSONAPIResponse(options)` - Apply automatic serialization to controllers/methods
- `@AllowedFilters(filters)` - Define allowed filter fields for a controller or method
- `@AllowedIncludes(includes)` - Define allowed include paths for a controller or method

### Services

- `SerializerService` - Main service for handling data serialization
- `SerializerRegistry` - Register and manage serializers

## License

MIT

---

## Documentation and Contribution

For more detailed information and API documentation, refer to the [GitHub repository](https://github.com/dev-jwshin/nestjs-jsonapi).

Issues and pull requests are always welcome! 
