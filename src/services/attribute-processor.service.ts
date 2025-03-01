import { Injectable, Type, NotFoundException } from '@nestjs/common';
import { AttributeMetadata, SerializerOptions } from '../interfaces/serializer.interface';

@Injectable()
export class AttributeProcessor {
  getAttributes(serializer: Type<any>, item: any, options: SerializerOptions): Record<string, any> {
    try {
      const attributes = Reflect.getMetadata('attributes', serializer) as AttributeMetadata[] || [];
      const serializerOptions = Reflect.getMetadata('jsonapi_serializer_options', serializer);
      
      if (!serializerOptions) {
        throw new NotFoundException(`Serializer metadata not found for ${serializer.name}`);
      }
      
      const result: Record<string, any> = {};
      
      // Handle sparse fieldsets
      const allowedFields = options.fields?.[serializerOptions.type];
      
      attributes.forEach(attr => {
        // Skip if not in sparse fieldset
        if (allowedFields && !allowedFields.includes(attr.name)) {
          return;
        }
        
        // Skip if condition fails
        if (attr.condition && !attr.condition(item, options.params)) {
          return;
        }
        
        result[attr.name] = item[attr.property];
      });
      
      return result;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to process attributes: ${error.message}`);
    }
  }
} 