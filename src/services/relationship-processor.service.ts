import { Injectable, Type, NotFoundException } from '@nestjs/common';
import { RelationshipMetadata, SerializerOptions } from '../interfaces/serializer.interface';

@Injectable()
export class RelationshipProcessor {
  getRelationships(serializer: Type<any>, item: any, options: SerializerOptions): Record<string, { data: any }> {
    try {
      const relationships = Reflect.getMetadata('relationships', serializer) as RelationshipMetadata[] || [];
      const result: Record<string, { data: any }> = {};
      
      relationships.forEach(rel => {
        // Skip if condition fails
        if (rel.condition && !rel.condition(item, options.params)) {
          return;
        }
        
        const data = this.serializeRelationship(rel, item);
        if (data !== undefined) {
          result[rel.name] = { data };
        }
      });
      
      return result;
    } catch (error) {
      throw new Error(`Failed to process relationships: ${error.message}`);
    }
  }
  
  serializeRelationship(relationship: RelationshipMetadata, item: any): any {
    try {
      const relatedData = item[relationship.property];
      
      if (relatedData === undefined || relatedData === null) {
        return relationship.type === 'hasMany' ? [] : null;
      }
      
      if (relationship.type === 'hasMany') {
        if (!Array.isArray(relatedData)) {
          return [];
        }
        return relatedData.map(related => this.buildRelationshipData(relationship, related));
      } else {
        return this.buildRelationshipData(relationship, relatedData);
      }
    } catch (error) {
      throw new Error(`Failed to serialize relationship: ${error.message}`);
    }
  }
  
  buildRelationshipData(relationship: RelationshipMetadata, item: any): { id: string, type: string } | null {
    if (!item) return null;
    
    try {
      // Handle polymorphic relationships
      let resourceType = relationship.resourceType;
      
      if (relationship.polymorphic) {
        if (typeof relationship.polymorphic === 'object') {
          // Use a safer type checking mechanism
          const polymorphicMap = relationship.polymorphic as Record<string, string>;
          for (const [className, type] of Object.entries(polymorphicMap)) {
            // This is still a runtime check, but better than the original code
            if (item.constructor && item.constructor.name === className) {
              resourceType = type;
              break;
            }
          }
        } else {
          // Determine resource type from item class
          resourceType = item.constructor ? item.constructor.name.toLowerCase() : undefined;
        }
      }
      
      if (!resourceType) {
        throw new Error('Resource type could not be determined');
      }
      
      // Get ID
      let id: string;
      if (relationship.idMethodName && item[relationship.idMethodName]) {
        id = String(item[relationship.idMethodName]);
      } else if (item.id !== undefined && item.id !== null) {
        id = String(item.id);
      } else {
        throw new Error('ID could not be determined');
      }
      
      return { id, type: resourceType };
    } catch (error) {
      throw new Error(`Failed to build relationship data: ${error.message}`);
    }
  }
} 