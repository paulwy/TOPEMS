/**
 * V44.0 Track D: BFF 代码生成辅助
 *
 * 提供代码生成工具函数，辅助快速生成：
 * - 实体 CRUD 查询
 * - TypeScript 类型定义
 * - React Query Hooks
 *
 * 用于开发时快速脚手架，运行时零依赖。
 */

// ============ 字符串工具函数 ============

export function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

export function toCamelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^-/, '');
}

const irregularPlurals: Record<string, string> = {
  person: 'people',
  man: 'men',
  woman: 'women',
  child: 'children',
  tooth: 'teeth',
  foot: 'feet',
  mouse: 'mice',
  goose: 'geese',
  sheep: 'sheep',
  fish: 'fish',
  deer: 'deer',
  moose: 'moose',
  data: 'data',
  information: 'information',
  equipment: 'equipment',
};

export function pluralize(str: string): string {
  const lower = str.toLowerCase();
  if (irregularPlurals[lower]) {
    return str.slice(0, 1) + irregularPlurals[lower].slice(1);
  }
  if (
    lower.endsWith('s') ||
    lower.endsWith('x') ||
    lower.endsWith('z') ||
    lower.endsWith('ch') ||
    lower.endsWith('sh')
  ) {
    return `${str}es`;
  }
  if (lower.endsWith('y') && !'aeiou'.includes(lower.charAt(lower.length - 2))) {
    return `${str.slice(0, -1)}ies`;
  }
  return `${str}s`;
}

export function singularize(str: string): string {
  const lower = str.toLowerCase();
  const reversed = Object.entries(irregularPlurals).find(([, p]) => p === lower);
  if (reversed) {
    return str.slice(0, 1) + reversed[0].slice(1);
  }
  if (lower.endsWith('ies') && lower.length > 3) {
    return `${str.slice(0, -3)}y`;
  }
  if (lower.endsWith('es') && lower.length > 2) {
    const withoutEs = str.slice(0, -2);
    const lowerWithoutEs = withoutEs.toLowerCase();
    if (
      lowerWithoutEs.endsWith('s') ||
      lowerWithoutEs.endsWith('x') ||
      lowerWithoutEs.endsWith('z') ||
      lowerWithoutEs.endsWith('ch') ||
      lowerWithoutEs.endsWith('sh')
    ) {
      return withoutEs;
    }
  }
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 1) {
    return str.slice(0, -1);
  }
  return str;
}

export function buildQueryName(entityName: string, operation: string): string {
  const pascal = toPascalCase(entityName);
  return `${operation}${pascal}`;
}

export function buildMutationName(entityName: string, operation: string): string {
  const pascal = toPascalCase(entityName);
  return `${operation}${pascal}`;
}

// ============ 字段定义类型 ============

export interface FieldDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'object' | 'array' | 'json';
  required?: boolean;
  description?: string;
  isId?: boolean;
  relation?: {
    type: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
    entity: string;
    foreignKey?: string;
  };
}

export interface EntitySchema {
  name: string;
  service: string;
  fields: FieldDefinition[];
  description?: string;
}

// ============ CRUD 查询生成 ============

export function generateEntityQueries(
  entityName: string,
  fields: FieldDefinition[]
): {
  listQuery: string;
  getQuery: string;
  createMutation: string;
  updateMutation: string;
  deleteMutation: string;
  countQuery: string;
} {
  const pascalName = toPascalCase(entityName);
  const pluralName = pluralize(entityName);
  const camelName = toCamelCase(entityName);

  const scalarFields = fields.filter((f) => !f.relation);
  const fieldNames = scalarFields.map((f) => f.name).join('\n    ');

  const listQuery = `query List${pascalName}($page: Int, $pageSize: Int, $keyword: String, $filter: JSON) {
  ${camelName}List(page: $page, pageSize: $pageSize, keyword: $keyword, filter: $filter) {
    items {
      ${fieldNames}
    }
    total
    page
    pageSize
  }
}`;

  const getQuery = `query Get${pascalName}($id: String!) {
  ${camelName}(id: $id) {
    ${fieldNames}
  }
}`;

  const createMutation = `mutation Create${pascalName}($data: JSON!) {
  create${pascalName}(data: $data) {
    ${fieldNames}
  }
}`;

  const updateMutation = `mutation Update${pascalName}($id: String!, $data: JSON!) {
  update${pascalName}(id: $id, data: $data) {
    ${fieldNames}
  }
}`;

  const deleteMutation = `mutation Delete${pascalName}($id: String!) {
  delete${pascalName}(id: $id)
}`;

  const countQuery = `query Count${pascalName}($filter: JSON) {
  ${camelName}Count(filter: $filter) {
    count
  }
}`;

  return {
    listQuery,
    getQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    countQuery,
  };
}

// ============ TypeScript 类型生成 ============

function mapFieldType(field: FieldDefinition): string {
  switch (field.type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
    case 'datetime':
      return 'string';
    case 'object':
    case 'json':
      return 'Record<string, unknown>';
    case 'array':
      return 'unknown[]';
    default:
      return 'unknown';
  }
}

export function generateTypeScriptTypes(schema: EntitySchema): string {
  const { name, fields } = schema;
  const pascalName = toPascalCase(name);

  const interfaceLines: string[] = [];
  interfaceLines.push(`export interface ${pascalName} {`);

  for (const field of fields) {
    if (field.description) {
      interfaceLines.push(`  /** ${field.description} */`);
    }
    const tsType = mapFieldType(field);
    const optional = field.required ? '' : '?';
    interfaceLines.push(`  ${field.name}${optional}: ${tsType};`);
  }

  interfaceLines.push('}');
  interfaceLines.push('');

  interfaceLines.push(`export interface ${pascalName}CreateInput {`);
  const createFields = fields.filter((f) => !f.isId);
  for (const field of createFields) {
    const tsType = mapFieldType(field);
    const optional = field.required ? '' : '?';
    interfaceLines.push(`  ${field.name}${optional}: ${tsType};`);
  }
  interfaceLines.push('}');
  interfaceLines.push('');

  interfaceLines.push(`export interface ${pascalName}UpdateInput {`);
  const updateFields = fields.filter((f) => !f.isId);
  for (const field of updateFields) {
    const tsType = mapFieldType(field);
    interfaceLines.push(`  ${field.name}?: ${tsType};`);
  }
  interfaceLines.push('}');
  interfaceLines.push('');

  interfaceLines.push(`export interface ${pascalName}ListResult {`);
  interfaceLines.push(`  items: ${pascalName}[];`);
  interfaceLines.push(`  total: number;`);
  interfaceLines.push(`  page: number;`);
  interfaceLines.push(`  pageSize: number;`);
  interfaceLines.push('}');

  return interfaceLines.join('\n');
}

// ============ React Query Hook 生成 ============

export function generateReactQueryHooks(
  entityName: string,
  operations: Array<'list' | 'get' | 'create' | 'update' | 'delete'> = [
    'list',
    'get',
    'create',
    'update',
    'delete',
  ]
): string {
  const pascalName = toPascalCase(entityName);
  const camelName = toCamelCase(entityName);
  const pluralName = pluralize(entityName);

  const lines: string[] = [];

  lines.push(
    `import { useQuery, useMutation, useQueryClient, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';`
  );
  lines.push(`import { bffGraphQL } from '@/api/bff';`);
  lines.push(
    `import type { ${pascalName}, ${pascalName}CreateInput, ${pascalName}UpdateInput, ${pascalName}ListResult } from './types';`
  );
  lines.push('');

  const queryKey = `['bff', '${camelName}']`;

  if (operations.includes('list')) {
    lines.push(
      `export function use${pascalName}List(params?: { page?: number; pageSize?: number; keyword?: string; filter?: Record<string, unknown> }) {`
    );
    lines.push(`  return useQuery<${pascalName}ListResult, Error>({`);
    lines.push(`    queryKey: [...${queryKey}, 'list', params],`);
    lines.push(`    queryFn: async () => {`);
    lines.push(`      const result = await bffGraphQL<{ ${camelName}List: ${pascalName}ListResult }>(\`
    query List${pascalName}($page: Int, $pageSize: Int, $keyword: String, $filter: JSON) {
      ${camelName}List(page: $page, pageSize: $pageSize, keyword: $keyword, filter: $filter) {
        items { id name }
        total
        page
        pageSize
      }
    }
  \`, params);`);
    lines.push(`      return result.${camelName}List;`);
    lines.push(`    },`);
    lines.push(`    staleTime: 5 * 60 * 1000,`);
    lines.push(`  });`);
    lines.push(`}`);
    lines.push('');
  }

  if (operations.includes('get')) {
    lines.push(`export function use${pascalName}Get(id: string | undefined) {`);
    lines.push(`  return useQuery<${pascalName} | null, Error>({`);
    lines.push(`    queryKey: [...${queryKey}, 'detail', id],`);
    lines.push(`    queryFn: async () => {`);
    lines.push(`      if (!id) return null;`);
    lines.push(`      const result = await bffGraphQL<{ ${camelName}: ${pascalName} }>(\`
    query Get${pascalName}($id: String!) {
      ${camelName}(id: $id) { id name }
    }
  \`, { id });`);
    lines.push(`      return result.${camelName};`);
    lines.push(`    },`);
    lines.push(`    enabled: !!id,`);
    lines.push(`    staleTime: 10 * 60 * 1000,`);
    lines.push(`  });`);
    lines.push(`}`);
    lines.push('');
  }

  if (operations.includes('create')) {
    lines.push(`export function use${pascalName}Create() {`);
    lines.push(`  const queryClient = useQueryClient();`);
    lines.push(`  return useMutation<${pascalName}, Error, ${pascalName}CreateInput>({`);
    lines.push(`    mutationFn: async (data) => {`);
    lines.push(`      const result = await bffGraphQL<{ create${pascalName}: ${pascalName} }>(\`
    mutation Create${pascalName}($data: JSON!) {
      create${pascalName}(data: $data) { id name }
    }
  \`, { data });`);
    lines.push(`      return result.create${pascalName};`);
    lines.push(`    },`);
    lines.push(`    onSuccess: () => {`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ${queryKey} });`);
    lines.push(`    },`);
    lines.push(`  });`);
    lines.push(`}`);
    lines.push('');
  }

  if (operations.includes('update')) {
    lines.push(`export function use${pascalName}Update() {`);
    lines.push(`  const queryClient = useQueryClient();`);
    lines.push(
      `  return useMutation<${pascalName}, Error, { id: string; data: ${pascalName}UpdateInput }>({`
    );
    lines.push(`    mutationFn: async ({ id, data }) => {`);
    lines.push(`      const result = await bffGraphQL<{ update${pascalName}: ${pascalName} }>(\`
    mutation Update${pascalName}($id: String!, $data: JSON!) {
      update${pascalName}(id: $id, data: $data) { id name }
    }
  \`, { id, data });`);
    lines.push(`      return result.update${pascalName};`);
    lines.push(`    },`);
    lines.push(`    onSuccess: (_, variables) => {`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ${queryKey} });`);
    lines.push(
      `      queryClient.invalidateQueries({ queryKey: [...${queryKey}, 'detail', variables.id] });`
    );
    lines.push(`    },`);
    lines.push(`  });`);
    lines.push(`}`);
    lines.push('');
  }

  if (operations.includes('delete')) {
    lines.push(`export function use${pascalName}Delete() {`);
    lines.push(`  const queryClient = useQueryClient();`);
    lines.push(`  return useMutation<boolean, Error, string>({`);
    lines.push(`    mutationFn: async (id) => {`);
    lines.push(`      const result = await bffGraphQL<{ delete${pascalName}: boolean }>(\`
    mutation Delete${pascalName}($id: String!) {
      delete${pascalName}(id: $id)
    }
  \`, { id });`);
    lines.push(`      return result.delete${pascalName};`);
    lines.push(`    },`);
    lines.push(`    onSuccess: () => {`);
    lines.push(`      queryClient.invalidateQueries({ queryKey: ${queryKey} });`);
    lines.push(`    },`);
    lines.push(`  });`);
    lines.push(`}`);
  }

  return lines.join('\n');
}

// ============ 页面模板生成 ============

export function generateListPageTemplate(entityName: string): string {
  const pascalName = toPascalCase(entityName);
  return `// ${pascalName} 列表页模板
// 使用 BffDataTable + useBffListPage 快速构建

import { BffDataTable, useBffListPage } from '@/components/bff';

export function ${pascalName}ListPage() {
  const { pageState, actions } = useBffListPage({
    entityType: '${entityName}',
    service: 'erp',
    queryKey: ['bff', '${entityName}'],
  });

  const columns = [
    { field: 'name', headerName: '名称', width: 200 },
    { field: 'status', headerName: '状态', width: 120 },
    { field: 'created_at', headerName: '创建时间', width: 180 },
  ];

  return (
    <BffDataTable
      columns={columns}
      entityType="${entityName}"
      service="erp"
      queryKey={['bff', '${entityName}']}
    />
  );
}
`;
}

// ============ CrudPage + EntitySchema 模板生成 ============

export function generateCrudPageTemplate(entityName: string, fields: FieldDefinition[]): string {
  const pascalName = toPascalCase(entityName);
  const camelName = toCamelCase(entityName);
  const pluralName = pluralize(entityName);

  // 生成 schema 字段定义
  const fieldDefinitions: string[] = [];
  for (const field of fields) {
    let fieldType = 'string';
    switch (field.type) {
      case 'number':
        fieldType = 'number';
        break;
      case 'boolean':
        fieldType = 'boolean';
        break;
      case 'date':
      case 'datetime':
        fieldType = 'date';
        break;
      case 'object':
      case 'json':
        fieldType = 'object';
        break;
      case 'array':
        fieldType = 'array';
        break;
    }

    const required = field.required ? 'true' : 'false';
    fieldDefinitions.push(`  {
    id: '${field.name}',
    type: '${fieldType}',
    label: '${field.description || field.name}',
    required: ${required},
  }`);
  }

  return `// ${pascalName} CRUD 页面模板
// 使用 CrudPage + EntitySchema 快速构建

import { CrudPage, type CrudApiAdapter } from '@/components/templates/CrudPage';
import { EntitySchema } from '@/schema';
import { ${camelName}Api, type ${pascalName} } from '@/api/${entityName}';

// EntitySchema 定义
export const ${camelName}Schema: EntitySchema<${pascalName}> = {
  entity: '${entityName}',
  title: '${pascalName}',
  fields: [
${fieldDefinitions.join(',\n')}
  ],
  list: {
    searchable: true,
    filters: [],
  },
};

// API 适配器
const apiAdapter: CrudApiAdapter<${pascalName}> = {
  list: async (params) => {
    const response = await ${camelName}Api.list${pascalName}s(params);
    return { data: response.data.items, total: response.data.total };
  },
  create: async (data) => {
    const response = await ${camelName}Api.create${pascalName}(data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await ${camelName}Api.update${pascalName}(id, data);
    return response.data;
  },
  delete: async (id) => {
    await ${camelName}Api.delete${pascalName}(id);
  },
};

export default function ${pascalName}Page() {
  return <CrudPage schema={${camelName}Schema} apiAdapter={apiAdapter} />;
}
`;
}

export default {
  toPascalCase,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  pluralize,
  singularize,
  buildQueryName,
  buildMutationName,
  generateEntityQueries,
  generateTypeScriptTypes,
  generateReactQueryHooks,
  generateListPageTemplate,
  generateCrudPageTemplate,
};
