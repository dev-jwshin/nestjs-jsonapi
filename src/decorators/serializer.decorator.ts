import { SetMetadata } from '@nestjs/common';
import 'reflect-metadata';

export const JSONAPI_SERIALIZER_OPTIONS = 'jsonapi_serializer_options';

export interface SerializerMetadataOptions {
  type?: string;
  id?: string | ((record: any, params?: any) => string);
  attributes?: string[];
}

export function JSONAPISerializer(options: SerializerMetadataOptions) {
  return (target: any) => {
    // Set type based on class name if not provided
    if (!options.type) {
      options.type = target.name.replace(/Serializer$/, '').toLowerCase();
    }
    
    // Set default ID method if not provided
    if (!options.id) {
      options.id = 'id';
    }
    
    SetMetadata(JSONAPI_SERIALIZER_OPTIONS, options)(target);
    
    // Store metadata about attributes and relationships (will be filled by other decorators)
    if (!Reflect.hasMetadata('attributes', target)) {
      Reflect.defineMetadata('attributes', [], target);
    }
    
    if (!Reflect.hasMetadata('relationships', target)) {
      Reflect.defineMetadata('relationships', [], target);
    }
  };
} 