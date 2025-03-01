import 'reflect-metadata';

export interface AttributeOptions {
  name?: string;
  condition?: (record: any, params?: any) => boolean;
}

export function Attribute(options: AttributeOptions = {}) {
  return (target: any, propertyKey: string) => {
    const attributes = Reflect.getMetadata('attributes', target.constructor) || [];
    
    attributes.push({
      property: propertyKey,
      name: options.name || propertyKey,
      condition: options.condition,
    });
    
    Reflect.defineMetadata('attributes', attributes, target.constructor);
  };
} 