import 'reflect-metadata';

export type RelationshipType = 'hasMany' | 'hasOne' | 'belongsTo';

export interface RelationshipOptions {
  type?: string;
  key?: string;
  serializer?: any;
  condition?: (record: any, params?: any) => boolean;
  idMethodName?: string;
  polymorphic?: boolean | Record<string, string>;
}

export function Relationship(relationshipType: RelationshipType, options: RelationshipOptions = {}) {
  return (target: any, propertyKey: string) => {
    const relationships = Reflect.getMetadata('relationships', target.constructor) || [];
    
    relationships.push({
      property: propertyKey,
      name: options.key || propertyKey,
      type: relationshipType,
      resourceType: options.type,
      serializer: options.serializer,
      condition: options.condition,
      idMethodName: options.idMethodName,
      polymorphic: options.polymorphic,
    });
    
    Reflect.defineMetadata('relationships', relationships, target.constructor);
  };
}

export function HasMany(options: RelationshipOptions = {}) {
  return Relationship('hasMany', options);
}

export function HasOne(options: RelationshipOptions = {}) {
  return Relationship('hasOne', options);
}

export function BelongsTo(options: RelationshipOptions = {}) {
  return Relationship('belongsTo', options);
} 