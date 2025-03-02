# @foryourdev/nestjs-jsonapi

A comprehensive NestJS package for implementing [JSON:API](https://jsonapi.org/) specification compliant APIs with TypeORM integration.

[![npm version](https://badge.fury.io/js/%40foryourdev%2Fnestjs-jsonapi.svg)](https://badge.fury.io/js/%40foryourdev%2Fnestjs-jsonapi)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

## Installation

```bash
npm install @foryourdev/nestjs-jsonapi
```

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

## Advanced Usage

### Filtering

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

### Including Related Resources

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

### Pagination

The package supports both offset-based and cursor-based pagination:

```typescript
// Offset-based (default)
// GET /users?page[number]=2&page[size]=10

// Cursor-based
// GET /users?page[after]=lastId&page[size]=10
```

## Documentation

For more detailed documentation, examples, and advanced features, please visit our [wiki](https://github.com/yourusername/nestjs-jsonapi/wiki).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

JunWon Shin <dev@foryourdev.com> 
