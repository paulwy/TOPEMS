/**
 * BFF Codegen utilities (stub - 待实现)
 */
export interface FieldDefinition {
  name: string;
  type: string;
  [key: string]: unknown;
}

export interface EntitySchema {
  name: string;
  fields: FieldDefinition[];
  [key: string]: unknown;
}

export function toKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function toPascalCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-\s]+/g, ' ')
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase())
    .replace(/\s+/g, '');
}

export function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/\s+/g, '_');
}
