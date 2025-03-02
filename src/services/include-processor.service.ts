import { Injectable, Type, NotFoundException } from '@nestjs/common';
import { SerializerOptions, RelationshipMetadata } from '../interfaces/serializer.interface';
import { SerializerRegistry } from './serializer-registry.service';

@Injectable()
export class IncludeProcessor {
  constructor(private readonly serializerRegistry: SerializerRegistry) {}
  
  processIncluded(
    mainSerializer: Type<any>, 
    data: any | any[], 
    options: SerializerOptions,
    serializeItemFn: (serializer: Type<any>, item: any, options: SerializerOptions) => any
  ): any[] {
    try {
      const included = new Map<string, any>();
      const isCollection = Array.isArray(data);
      
      const process = (serializerClass: Type<any>, item: any, includePaths: string[]) => {
        if (!item) return;
        
        const relationships = Reflect.getMetadata('relationships', serializerClass) as RelationshipMetadata[] || [];
        
        for (const rel of relationships) {
          // Check if this relationship should be included based on the include paths
          if (!includePaths.some(path => path === rel.name || path.startsWith(`${rel.name}.`))) {
            continue;
          }
          
          const relatedItems = item[rel.property];
          if (relatedItems === undefined || relatedItems === null) continue;
          
          const items = Array.isArray(relatedItems) ? relatedItems : [relatedItems];
          const nextLevelIncludes = includePaths
            .filter(path => path.startsWith(`${rel.name}.`))
            .map(path => path.substring(rel.name.length + 1));
          
          for (const relatedItem of items) {
            if (!relatedItem) continue;
            
            // Determine serializer to use
            let relatedSerializer = rel.serializer;
            if (!relatedSerializer) {
              // Try to find by type from registry
              const typeName = relatedItem.constructor ? relatedItem.constructor.name : null;
              if (typeName) {
                // Try by full name 
                relatedSerializer = this.serializerRegistry.find(typeName.toLowerCase());
                
                // Try by convention if not found
                if (!relatedSerializer) {
                  const serializerName = `${typeName}Serializer`;
                  relatedSerializer = this.serializerRegistry.find(serializerName.toLowerCase());
                }
                
                // If still not found, check if we can determine from polymorphic relation
                if (!relatedSerializer && rel.polymorphic && typeof rel.polymorphic === 'object') {
                  const polymorphicMap = rel.polymorphic as Record<string, string>;
                  const typeFromMap = polymorphicMap[typeName];
                  if (typeFromMap) {
                    relatedSerializer = this.serializerRegistry.find(typeFromMap);
                  }
                }
              }
            }
            
            if (relatedSerializer) {
              const serialized = serializeItemFn(relatedSerializer, relatedItem, {
                ...options,
                include: nextLevelIncludes
              });
              
              if (serialized && serialized.id && serialized.type) {
                const key = `${serialized.type}:${serialized.id}`;
                if (!included.has(key)) {
                  included.set(key, serialized);
                }
                
                // Process next level includes
                if (nextLevelIncludes.length > 0) {
                  process(relatedSerializer, relatedItem, nextLevelIncludes);
                }
              }
            }
          }
        }
      };
      
      if (isCollection) {
        for (const item of data) {
          process(mainSerializer, item, options.include || []);
        }
      } else {
        process(mainSerializer, data, options.include || []);
      }
      
      return Array.from(included.values());
    } catch (error) {
      throw new Error(`Failed to process included resources: ${error.message}`);
    }
  }

  /**
   * 포함된 관계 처리 (신규 버전)
   */
  processIncludes(
    serializer: Type<any>,
    data: any[],
    options: SerializerOptions
  ): any[] {
    // processIncluded와 동일한 기능을 수행하도록 구현
    // 임시로 빈 배열 반환
    return [];
  }
} 