/**
 * V44.0 Track D: GraphQL 查询构建器
 *
 * 提供类型安全的 GraphQL 查询/变更构建能力：
 * - QueryBuilder: 动态构建查询（select/filter/sort/paginate/include）
 * - MutationBuilder: 动态构建变更（create/update/delete/batch）
 * - 常用查询模板: list/get/create/update/delete/count/aggregate
 *
 * 使用模板字符串生成，运行时零依赖。
 */

// ============ 类型定义 ============

export type FieldType = string | [string, FieldSelection];

export type FieldSelection = FieldType[];

export interface SortField {
  field: string;
  order?: 'asc' | 'desc';
}

export interface FilterCondition {
  field: string;
  operator?:
    | 'eq'
    | 'ne'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'nin'
    | 'contains'
    | 'startsWith'
    | 'endsWith';
  value: unknown;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  offset?: number;
  limit?: number;
  cursor?: string;
}

export interface IncludeRelation {
  field: string;
  selection?: FieldSelection;
  args?: Record<string, unknown>;
}

export interface BuiltQuery {
  query: string;
  variables: Record<string, unknown>;
  operationName: string;
}

// ============ 工具函数 ============

function indent(str: string, level = 1): string {
  const spaces = '  '.repeat(level);
  return str
    .split('\n')
    .map((line) => (line ? spaces + line : line))
    .join('\n');
}

function buildSelectionSet(fields: FieldSelection, level = 1): string {
  const lines: string[] = [];
  for (const field of fields) {
    if (typeof field === 'string') {
      lines.push(field);
    } else if (Array.isArray(field) && field.length === 2) {
      const [name, subSelection] = field;
      lines.push(`${name} {`);
      lines.push(indent(buildSelectionSet(subSelection, level + 1), level));
      lines.push('}');
    }
  }
  return lines.join('\n');
}

function toGraphQLValue(
  value: unknown,
  varName: string
): { expr: string; vars: Record<string, unknown> } {
  if (value === null || value === undefined) {
    return { expr: 'null', vars: {} };
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { expr: `$${varName}`, vars: { [varName]: value } };
  }
  return { expr: `$${varName}`, vars: { [varName]: value } };
}


export class QueryBuilder<T = unknown> {
  private entityName: string;
  private operationName: string;
  private fields: FieldSelection = [];
  private filters: FilterCondition[] = [];
  private sortFields: SortField[] = [];
  private pagination: PaginationParams = {};
  private includes: IncludeRelation[] = [];
  private variableCounter = 0;

  constructor(entityName: string, operationName?: string) {
    this.entityName = entityName;
    this.operationName = operationName ?? entityName.charAt(0).toUpperCase() + entityName.slice(1);
  }

  select(...fields: FieldSelection): this {
    this.fields = [...this.fields, ...fields];
    return this;
  }

  filter(field: string, value: unknown, operator: FilterCondition['operator'] = 'eq'): this {
    this.filters.push({ field, operator, value });
    return this;
  }

  sort(field: string, order: 'asc' | 'desc' = 'asc'): this {
    this.sortFields.push({ field, order });
    return this;
  }

  paginate(params: PaginationParams): this {
    this.pagination = { ...this.pagination, ...params };
    return this;
  }

  include(field: string, selection?: FieldSelection, args?: Record<string, unknown>): this {
    this.includes.push({ field, selection, args });
    return this;
  }

  private nextVarName(prefix: string): string {
    this.variableCounter++;
    return `${prefix}_${this.variableCounter}`;
  }

  build(): string {
    const { query } = this.buildWithVariables();
    return query;
  }

  buildWithVariables(): BuiltQuery {
    const variables: Record<string, unknown> = {};
    const args: string[] = [];
    const varDefs: string[] = [];

    if (this.filters.length > 0) {
      const filterObj: Record<string, unknown> = {};
      for (const f of this.filters) {
        const op = f.operator === 'eq' ? f.field : `${f.field}_${f.operator}`;
        filterObj[op] = f.value;
      }
      const varName = this.nextVarName('filter');
      variables[varName] = filterObj;
      args.push(`filter: $${varName}`);
      varDefs.push(`$${varName}: JSON`);
    }

    if (this.sortFields.length > 0) {
      const varName = this.nextVarName('sort');
      variables[varName] = this.sortFields.map((s) => ({ field: s.field, order: s.order }));
      args.push(`sort: $${varName}`);
      varDefs.push(`$${varName}: [SortInput!]`);
    }

    if (this.pagination.page !== undefined) {
      const varName = this.nextVarName('page');
      variables[varName] = this.pagination.page;
      args.push(`page: $${varName}`);
      varDefs.push(`$${varName}: Int`);
    }

    if (this.pagination.pageSize !== undefined) {
      const varName = this.nextVarName('pageSize');
      variables[varName] = this.pagination.pageSize;
      args.push(`pageSize: $${varName}`);
      varDefs.push(`$${varName}: Int`);
    }

    if (this.pagination.limit !== undefined) {
      const varName = this.nextVarName('limit');
      variables[varName] = this.pagination.limit;
      args.push(`limit: $${varName}`);
      varDefs.push(`$${varName}: Int`);
    }

    if (this.pagination.offset !== undefined) {
      const varName = this.nextVarName('offset');
      variables[varName] = this.pagination.offset;
      args.push(`offset: $${varName}`);
      varDefs.push(`$${varName}: Int`);
    }

    if (this.pagination.cursor !== undefined) {
      const varName = this.nextVarName('cursor');
      variables[varName] = this.pagination.cursor;
      args.push(`cursor: $${varName}`);
      varDefs.push(`$${varName}: String`);
    }

    const allFields: FieldSelection = [...this.fields];
    for (const inc of this.includes) {
      if (inc.selection) {
        allFields.push([inc.field, inc.selection]);
      } else {
        allFields.push(inc.field);
      }
    }

    const selectionStr = allFields.length > 0 ? buildSelectionSet(allFields) : '';
    const argsStr = args.length > 0 ? `(${args.join(', ')})` : '';
    const varDefStr = varDefs.length > 0 ? `(${varDefs.join(', ')})` : '';

    const query = `query ${this.operationName}${varDefStr} {
  ${this.entityName}${argsStr} {
${indent(selectionStr, 2)}
  }
}`;

    return { query, variables, operationName: this.operationName };
  }
}

// ============ MutationBuilder ============

export class MutationBuilder<T = unknown> {
  private entityName: string;
  private operationName: string;
  private returnFields: FieldSelection = ['id'];
  private variableCounter = 0;

  constructor(entityName: string, operationName?: string) {
    this.entityName = entityName;
    this.operationName =
      operationName ?? `${entityName.charAt(0).toUpperCase() + entityName.slice(1)}Mutation`;
  }

  returns(...fields: FieldSelection): this {
    this.returnFields = fields;
    return this;
  }

  private nextVarName(prefix: string): string {
    this.variableCounter++;
    return `${prefix}_${this.variableCounter}`;
  }

  create(data: Record<string, unknown>): BuiltQuery {
    const varName = this.nextVarName('data');
    const variables: Record<string, unknown> = { [varName]: data };
    const selectionStr = buildSelectionSet(this.returnFields);

    const query = `mutation Create${this.operationName}($${varName}: JSON!) {
  create${this.entityName.charAt(0).toUpperCase() + this.entityName.slice(1)}(data: $${varName}) {
${indent(selectionStr, 2)}
  }
}`;

    return {
      query,
      variables,
      operationName: `Create${this.operationName}`,
    };
  }

  update(id: string, data: Record<string, unknown>): BuiltQuery {
    const idVar = this.nextVarName('id');
    const dataVar = this.nextVarName('data');
    const variables: Record<string, unknown> = { [idVar]: id, [dataVar]: data };
    const selectionStr = buildSelectionSet(this.returnFields);

    const query = `mutation Update${this.operationName}($${idVar}: String!, $${dataVar}: JSON!) {
  update${this.entityName.charAt(0).toUpperCase() + this.entityName.slice(1)}(id: $${idVar}, data: $${dataVar}) {
${indent(selectionStr, 2)}
  }
}`;

    return {
      query,
      variables,
      operationName: `Update${this.operationName}`,
    };
  }

  delete(id: string): BuiltQuery {
    const idVar = this.nextVarName('id');
    const variables: Record<string, unknown> = { [idVar]: id };

    const query = `mutation Delete${this.operationName}($${idVar}: String!) {
  delete${this.entityName.charAt(0).toUpperCase() + this.entityName.slice(1)}(id: $${idVar})
}`;

    return {
      query,
      variables,
      operationName: `Delete${this.operationName}`,
    };
  }

  batchCreate(items: Record<string, unknown>[]): BuiltQuery {
    const varName = this.nextVarName('items');
    const variables: Record<string, unknown> = { [varName]: items };
    const selectionStr = buildSelectionSet(this.returnFields);

    const query = `mutation BatchCreate${this.operationName}($${varName}: [JSON!]!) {
  batchCreate${this.entityName.charAt(0).toUpperCase() + this.entityName.slice(1)}(items: $${varName}) {
${indent(selectionStr, 2)}
  }
}`;

    return {
      query,
      variables,
      operationName: `BatchCreate${this.operationName}`,
    };
  }

  batchUpdate(updates: Array<{ id: string; data: Record<string, unknown> }>): BuiltQuery {
    const varName = this.nextVarName('updates');
    const variables: Record<string, unknown> = { [varName]: updates };
    const selectionStr = buildSelectionSet(this.returnFields);

    const query = `mutation BatchUpdate${this.operationName}($${varName}: [BatchUpdateInput!]!) {
  batchUpdate${this.entityName.charAt(0).toUpperCase() + this.entityName.slice(1)}(updates: $${varName}) {
${indent(selectionStr, 2)}
  }
}`;

    return {
      query,
      variables,
      operationName: `BatchUpdate${this.operationName}`,
    };
  }

  batchDelete(ids: string[]): BuiltQuery {
    const varName = this.nextVarName('ids');
    const variables: Record<string, unknown> = { [varName]: ids };

    const query = `mutation BatchDelete${this.operationName}($${varName}: [String!]!) {
  batchDelete${this.entityName.charAt(0).toUpperCase() + this.entityName.slice(1)}(ids: $${varName})
}`;

    return {
      query,
      variables,
      operationName: `BatchDelete${this.operationName}`,
    };
  }
}

// ============ 常用查询模板 ============

export const queryTemplates = {
  list(entityType: string, fields: FieldSelection, page = 1, pageSize = 10): BuiltQuery {
    const builder = new QueryBuilder(
      `${entityType}List`,
      `List${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`
    );
    builder.select(['items', fields], 'total', 'page', 'pageSize');
    builder.paginate({ page, pageSize });
    return builder.buildWithVariables();
  },

  get(entityType: string, id: string, fields: FieldSelection): BuiltQuery {
    const builder = new QueryBuilder(
      entityType,
      `Get${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`
    );
    builder.select(...fields);
    builder.filter('id', id);
    return builder.buildWithVariables();
  },

  count(entityType: string, filter?: Record<string, unknown>): BuiltQuery {
    const builder = new QueryBuilder(
      `${entityType}Count`,
      `Count${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`
    );
    builder.select('count');
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => builder.filter(k, v));
    }
    return builder.buildWithVariables();
  },

  create(
    entityType: string,
    data: Record<string, unknown>,
    returnFields: FieldSelection = ['id']
  ): BuiltQuery {
    const builder = new MutationBuilder(
      entityType,
      entityType.charAt(0).toUpperCase() + entityType.slice(1)
    );
    builder.returns(...returnFields);
    return builder.create(data);
  },

  update(
    entityType: string,
    id: string,
    data: Record<string, unknown>,
    returnFields: FieldSelection = ['id']
  ): BuiltQuery {
    const builder = new MutationBuilder(
      entityType,
      entityType.charAt(0).toUpperCase() + entityType.slice(1)
    );
    builder.returns(...returnFields);
    return builder.update(id, data);
  },

  delete(entityType: string, id: string): BuiltQuery {
    const builder = new MutationBuilder(
      entityType,
      entityType.charAt(0).toUpperCase() + entityType.slice(1)
    );
    return builder.delete(id);
  },

  aggregate(
    entityType: string,
    aggregations: Array<{
      field: string;
      function: 'sum' | 'avg' | 'min' | 'max' | 'count';
      alias?: string;
    }>,
    filter?: Record<string, unknown>
  ): BuiltQuery {
    const opName = `Aggregate${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`;
    const fields: FieldSelection = aggregations.map((a) => a.alias || `${a.function}_${a.field}`);
    const builder = new QueryBuilder(`${entityType}Aggregate`, opName);
    builder.select(...fields);
    if (filter) {
      Object.entries(filter).forEach(([k, v]) => builder.filter(k, v));
    }
    return builder.buildWithVariables();
  },
};

export default QueryBuilder;
