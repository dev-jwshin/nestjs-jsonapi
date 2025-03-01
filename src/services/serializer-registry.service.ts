import { Injectable, Type } from '@nestjs/common';

@Injectable()
export class SerializerRegistry {
  private serializers = new Map<string, Type<any>>();

  register(type: string, serializer: Type<any>): void {
    this.serializers.set(type, serializer);
  }

  registerByClassName(serializer: Type<any>): void {
    const typeName = this.getResourceTypeFromSerializer(serializer);
    if (typeName) {
      this.register(typeName, serializer);
    }
  }

  find(type: string): Type<any> | null {
    return this.serializers.get(type) || null;
  }

  private getResourceTypeFromSerializer(serializer: Type<any>): string | null {
    const serializerOptions = Reflect.getMetadata('jsonapi_serializer_options', serializer);
    if (serializerOptions && serializerOptions.type) {
      return serializerOptions.type;
    }
    
    // Try to derive from class name
    const className = serializer.name;
    if (className.endsWith('Serializer')) {
      return className.replace(/Serializer$/, '').toLowerCase();
    }
    
    return null;
  }
} 