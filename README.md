# @foryourdev/nestjs-jsonapi

A comprehensive NestJS package for implementing [JSON:API](https://jsonapi.org/) specification compliant APIs with TypeORM integration.

[![npm version](https://badge.fury.io/js/%40foryourdev%2Fnestjs-jsonapi.svg)](https://badge.fury.io/js/%40foryourdev%2Fnestjs-jsonapi)
[![NestJS Support](https://img.shields.io/badge/NestJS-10.x%20%7C%2011.x-E0234E.svg)](https://nestjs.com/)

## Overview

This package provides a complete solution for implementing JSON:API compliant APIs in NestJS applications. It integrates seamlessly with TypeORM and provides an elegant decorator-based approach for serializing resources according to the JSON:API specification.

## Features

- 🚀 **Full JSON:API Compliance** - Implement APIs that fully adhere to the [JSON:API specification](https://jsonapi.org/)
- 🧩 **TypeORM Integration** - Seamless integration with TypeORM for database operations
- 🎯 **Elegant Decorator API** - Intuitive decorator-based approach for resource serialization
- 🔍 **Advanced Filtering** - Support for complex filtering with various operators (gt, lt, gte, lte, in, nin, like)
- 🔄 **Relationship Handling** - Easy handling of resource relationships with inclusion capabilities
- 📊 **Pagination Support** - Both offset-based and cursor-based pagination
- 🔠 **Sorting** - Multi-field sorting with directional control
- 🔧 **Sparse Fieldsets** - Request only the fields you need
- 🛡️ **TypeScript Support** - Built with TypeScript for excellent type safety and developer experience
- 📥 **Request Processing** - Process JSON:API formatted requests with automatic transformation
- 🔁 **NestJS 10.x & 11.x Support** - Compatible with the latest NestJS versions
- ⚠️ **Standardized Error Handling** - Built-in JsonApiError for JSON:API compliant error responses

## Installation

```bash
npm install @foryourdev/nestjs-jsonapi@latest
```

## Required Dependencies

This package has the following peer dependencies:
- `@nestjs/core`: ^10.4.15 || ^11.0.0

And the following dependencies that are included:
- `@nestjs/common`: ^10.4.15 || ^11.0.0
- `@nestjs/platform-express`: ^10.4.15 || ^11.0.0
- `@nestjs/typeorm`: ^11.0.0
- TypeORM and other utilities

## Quick Start

### 1. Register the Module

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JsonApiModule } from '@foryourdev/nestjs-jsonapi';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // your TypeORM configuration
    }),
    TypeOrmModule.forFeature([User]),
    JsonApiModule.forRoot({
      pagination: {
        enabled: true,
        size: 25
      }
      // Global exception filter is enabled by default
    }),
    JsonApiModule.forFeature([User]),
  ],
})
export class AppModule {}
```

### 2. Define Serializers

```typescript
import { Serializer, Attribute, Relationship } from '@foryourdev/nestjs-jsonapi';
import { User } from '../entities/user.entity';

@Serializer('users')
export class UserSerializer {
  @Attribute()
  id: number;

  @Attribute()
  name: string;

  @Attribute()
  email: string;

  @Attribute({ serializedName: 'registeredAt' })
  createdAt: Date;

  @Relationship({ type: 'posts' })
  posts: Post[];
}
```

### 3. Use in Controllers

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { JsonApiResponse } from '@foryourdev/nestjs-jsonapi';
import { UserService } from './user.service';
import { UserSerializer } from './serializers/user.serializer';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @JsonApiResponse(UserSerializer)
  async findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @JsonApiResponse(UserSerializer)
  async findOne(@Param('id') id: number) {
    return this.userService.findOne(id);
  }
}
```

## Detailed Documentation

### Core Decorators

#### Resource Serialization

| Decorator | Description |
|-----------|-------------|
| `@Serializer(type)` | Class decorator that defines a JSON:API resource type |
| `@Attribute(options?)` | Property decorator that defines a resource attribute |
| `@Relationship(options)` | Property decorator that defines a resource relationship |
| `@JsonApiResponse(serializer)` | Method decorator that serializes responses to JSON:API format |

#### Request Handling

| Decorator | Description |
|-----------|-------------|
| `@AllowedFilters(fields)` | Method decorator that specifies which fields can be filtered |
| `@AllowedIncludes(relationships)` | Method decorator that specifies which relationships can be included |
| `@JsonApiBody(type)` | Parameter decorator that transforms JSON:API request bodies to DTOs |
| `@RawJsonApiBody()` | Parameter decorator that provides access to the raw JSON:API request |

### Advanced Usage

#### Filtering

Enable filtering in your controllers with the `@AllowedFilters` decorator:

```typescript
import { Controller, Get } from '@nestjs/common';
import { JsonApiResponse, AllowedFilters } from '@foryourdev/nestjs-jsonapi';
import { UserService } from './user.service';
import { UserSerializer } from './serializers/user.serializer';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @JsonApiResponse(UserSerializer)
  @AllowedFilters(['name', 'email', 'role'])
  async findAll() {
    // The filters will be automatically applied through interceptors
    return this.userService.findAll();
  }
}
```

Clients can then make requests like:
```
GET /users?filter[name]=John&filter[role]=admin
GET /users?filter[email][like]=@example.com
GET /users?filter[age][gt]=30
```

#### Including Related Resources

Enable the inclusion of related resources with the `@AllowedIncludes` decorator:

```typescript
@Get()
@JsonApiResponse(UserSerializer)
@AllowedIncludes(['posts', 'profile'])
async findAll() {
  return this.userService.findAll();
}
```

Clients can then include related resources:
```
GET /users?include=posts,profile
```

#### Field Selection (Sparse Fieldsets)

Clients can request specific fields to reduce payload size:

```
GET /users?fields[users]=name,email&fields[posts]=title
```

#### Sorting

Sort resources by one or more fields:

```
GET /users?sort=name,-createdAt
```

The minus sign indicates descending order.

### Handling JSON:API Request Bodies

The package supports handling JSON:API formatted request bodies, automatically transforming them into regular DTOs:

```typescript
import { Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { JsonApiResponse, JsonApiBody } from '@foryourdev/nestjs-jsonapi';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@JsonApiBody('users') createUserDto: CreateUserDto) {
    // createUserDto is transformed and validated through ValidationPipe
    return this.usersService.create(createUserDto);
  }
}
```

### Using with ValidationPipe

The `@JsonApiBody()` decorator works seamlessly with NestJS's ValidationPipe, allowing you to validate transformed JSON:API requests using class-validator decorators on your DTOs.

#### Controller Setup

```typescript
import { Controller, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { JsonApiResponse, JsonApiBody } from '@foryourdev/nestjs-jsonapi';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async create(@JsonApiBody('users') createUserDto: CreateUserDto) {
    // createUserDto is transformed and validated through ValidationPipe
    return this.usersService.create(createUserDto);
  }
}
```

#### DTO Class Definition

```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  phone: string;
}
```

#### JSON:API Request Example

```json
{
  "data": {
    "type": "users",
    "attributes": {
      "name": "Test User",
      "email": "test@example.com",
      "password": "password123",
      "phone": "01012345678"
    }
  }
}
```

The `@JsonApiBody()` decorator transforms the JSON:API request into a plain object, and ValidationPipe then validates it against your DTO class:

```json
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "password123",
  "phone": "01012345678"
}
```

#### Resource Type Handling

When using the `@JsonApiBody()` decorator, you have two options for specifying the resource type:

1. **Explicitly in the decorator**: `@JsonApiBody('users')` - This takes precedence over the request body's type
2. **From the request body**: If you use `@JsonApiBody()` without arguments, the type will be taken from the `data.type` property in the JSON:API request

Note that you must specify the resource type in at least one of these ways. If both are missing, the decorator will throw a `BadRequestException`.

```typescript
// Option 1: Type specified in decorator (preferred)
@Post()
async create(@JsonApiBody('users') dto: CreateUserDto) {
  // ...
}

// Option 2: Type taken from request body
@Post()
async create(@JsonApiBody() dto: CreateUserDto) {
  // Request must include "type": "users" in the data object
  // ...
}
```

#### Controlling the `_type` Property

By default, the transformed object does not include the `_type` property. If you need to preserve the resource type from the JSON:API request, you can set the `preserveType` option to `true`:

```typescript
// Keep the _type property in the transformed object
@Post()
async create(@JsonApiBody({ resourceType: 'users', preserveType: true }) dto: CreateUserDto) {
  // dto will include the _type property
  // ...
}
```

The `_type` property can be useful when:
- You need to know the original resource type in your service logic
- You're building responses that need to be converted back to JSON:API format
- You're working with polymorphic resources

For most use cases, especially with ValidationPipe and DTOs, you won't need the `_type` property.

You can also access the raw JSON:API request using the `RawJsonApiBody` decorator:

```typescript
import { Controller, Post } from '@nestjs/common';
import { JsonApiResponse, RawJsonApiBody, JsonApiRequest } from '@foryourdev/nestjs-jsonapi';

@Controller('users')
export class UserController {
  @Post()
  @JsonApiResponse(UserSerializer)
  async create(@RawJsonApiBody() jsonApiRequest: JsonApiRequest) {
    // Work with the raw JSON:API request
    const { data, included } = jsonApiRequest;
    // ...
  }
}
```

### Pagination

The package supports both offset-based and cursor-based pagination:

```typescript
// Offset-based (default)
// GET /users?page[number]=2&page[size]=10

// Cursor-based
// GET /users?page[after]=lastId&page[size]=10
```

#### Customizing Pagination

You can customize the pagination settings in the module configuration:

```typescript
JsonApiModule.forRoot({
  pagination: {
    enabled: true,
    size: 25,        // Default page size
    sizeLimit: 100,  // Maximum allowed page size
    defaultStrategy: 'offset' // 'offset' or 'cursor'
  }
})
```

### Custom Attribute Serialization

You can customize how attributes are serialized using the `@Attribute` decorator options:

```typescript
@Serializer('users')
export class UserSerializer {
  @Attribute({ serializedName: 'fullName' })
  name: string;
  
  @Attribute({ 
    serializedName: 'joinedDate',
    serializer: (value) => value.toISOString().split('T')[0]
  })
  createdAt: Date;
}
```

### Custom Error Handling

#### Using JsonApiError

The package provides a built-in `JsonApiError` class that allows you to throw errors that will automatically be formatted according to the JSON:API specification:

```typescript
import { Controller, Post } from '@nestjs/common';
import { JsonApiResponse, JsonApiBody, JsonApiError } from '@foryourdev/nestjs-jsonapi';
import { UserService } from './user.service';
import { UserSerializer } from './serializers/user.serializer';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Post()
  @JsonApiResponse(UserSerializer)
  async create(@JsonApiBody('users') createUserDto: CreateUserDto) {
    // Check if email already exists
    const existingUser = await this.userService.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new JsonApiError('Email is already in use', 400, {
        pointer: '/data/attributes/email'
      });
    }
    
    return this.userService.create(createUserDto);
  }
}
```

The `JsonApiError` constructor accepts the following parameters:
- `message`: The error message
- `status`: The HTTP status code (default: 400)
- `source`: (optional) The source of the error, can include:
  - `pointer`: JSON pointer to the specific field that caused the error
  - `parameter`: Query parameter that caused the error
- `code`: (optional) Application-specific error code
- `meta`: (optional) Additional metadata about the error

When a `JsonApiError` is thrown, it will automatically be caught and transformed into the following JSON:API compliant response:

```json
{
  "errors": [
    {
      "status": "400",
      "title": "Email is already in use",
      "source": {
        "pointer": "/data/attributes/email"
      }
    }
  ]
}
```

#### Global Exception Filter

All exceptions are automatically formatted according to the JSON:API specification by default. If you want to disable this behavior, you can set the `enableGlobalExceptionFilter` option to `false`:

```typescript
// app.module.ts
@Module({
  imports: [
    // ...other imports
    JsonApiModule.forRoot({
      enableGlobalExceptionFilter: false // Disable the global exception filter
    }),
  ],
})
export class AppModule {}
```

With the default configuration, all exceptions (including NestJS built-in exceptions and your own custom exceptions) will be transformed into JSON:API compliant error responses.

For example, throwing a simple error:

```typescript
throw new Error('Something went wrong');
```

Will produce a JSON:API error response:

```json
{
  "errors": [
    {
      "status": "500",
      "title": "Internal Server Error",
      "detail": "Something went wrong"
    }
  ]
}
```

And built-in NestJS exceptions:

```typescript
throw new NotFoundException('User not found');
```

Will produce:

```json
{
  "errors": [
    {
      "status": "404",
      "title": "Not Found",
      "detail": "User not found"
    }
  ]
}
```

#### Manual Registration of Exception Filter

If you've disabled the global exception filter but still want to use it in specific parts of your application, you can manually register it in your main.ts file:

```typescript
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JsonApiExceptionFilter } from '@foryourdev/nestjs-jsonapi';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new JsonApiExceptionFilter());
  await app.listen(3000);
}
bootstrap();
```

## TypeORM Integration

This package provides a powerful integration with TypeORM, allowing you to easily filter, sort, and paginate your resources using the JSON:API query parameters.

### Automatic Query Building

The package automatically builds TypeORM queries based on the JSON:API query parameters:

```typescript
import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JsonApiResponse, AllowedFilters, AllowedIncludes } from '@foryourdev/nestjs-jsonapi';
import { User } from './entities/user.entity';
import { UserSerializer } from './serializers/user.serializer';

@Controller('users')
export class UserController {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  @Get()
  @JsonApiResponse(UserSerializer)
  @AllowedFilters(['name', 'email', 'role'])
  @AllowedIncludes(['posts', 'profile'])
  async findAll() {
    // The query will be automatically built based on the request parameters
    return this.userRepository.find();
  }
}
```

## Advanced Configuration

### Module Configuration Options

The `JsonApiModule.forRoot()` method accepts a configuration object with the following options:

```typescript
JsonApiModule.forRoot({
  // Pagination settings
  pagination: {
    enabled: true,
    size: 25,
    sizeLimit: 100,
    defaultStrategy: 'offset'
  },
  
  // Base URL for generating links
  baseUrl: 'https://api.example.com',
  
  // Custom path parameters to include in links
  preservePathParams: true,
  
  // Enable/disable case sensitivity for query parameters
  caseSensitiveParams: false,
  
  // Default include paths (applied to all endpoints)
  defaultIncludes: [],
  
  // Custom query parameter names
  queryParamNames: {
    include: 'include',
    fields: 'fields',
    filter: 'filter',
    sort: 'sort',
    page: 'page'
  }
})
```

## Author

JunWon Shin <dev@foryourdev.com> 
