/**
 * V44.0 Track D: BFF 查询/变更构建器
 *
 * 面向 GraphQL / REST 的数据查询与变更构建工具：
 * - QueryBuilder：链式构建查询（字段选择 / 过滤 / 排序 / 分页 / 关联）
 * - MutationBuilder：构建创建 / 更新 / 删除变更
 * - queryTemplates：常用查询模板（列表 / 详情 / 关联）
 *
 * 与 BffDataTable / BffDetailPage / BffFormPage 配合，
 * 由字段配置自动生成查询与变更。
 */

// ==================== 类型定义 ====================

/** 字段类型 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'enum'
  | 'json'
  | 'uuid';

/** 字段选择（key → 是否选择；也可用 true 简化） */
export type FieldSelection = Record<string, boolean>;

/** 排序字段 */
export interface SortField {
  /** 字段名 */
  field: string;
  /** 排序方向 */
  direction: 'asc' | 'desc';
}

/** 过滤条件 */
export interface FilterCondition {
  /** 字段名 */
  field: string;
  /** 操作符 */
  operator:
    | 'eq'
    | 'neq'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains'
    | 'startsWith'
    | 'endsWith'
    | 'in'
    | 'between'
    | 'isNull'
    | 'isNotNull';
  /** 单值 */
  value?: unknown;
  /** 多值（in / between 使用） */
  values?: unknown[];
}

/** 分页参数 */
export interface PaginationParams {
  /** 页码（从 1 开始） */
  page: number;
  /** 每页条数 */
  pageSize: number;
}

/** 关联关系 */
export interface IncludeRelation {
  /** 关联名（GraphQL 字段名） */
  relation: string;
  /** 关联字段选择 */
  fields?: FieldSelection;
  /** 嵌套关联 */
  nested?: IncludeRelation[];
}

/** 构建完成的查询 */
export interface BuiltQuery {
  /** 查询体（GraphQL query / REST query string） */
  query: string;
  /** 变量 */
  variables: Record<string, unknown>;
  /** 操作名 */
  operationName?: string;
}

// ==================== 工具函数 ====================

function fieldSelectionToList(selection?: FieldSelection): string[] {
  if (!selection) return [];
  return Object.keys(selection).filter((k) => selection[k] === true);
}

function opToGraphql(op: FilterCondition['operator']): string {
  switch (op) {
    case 'eq':
      return '_eq';
    case 'neq':
      return '_neq';
    case 'gt':
      return '_gt';
    case 'gte':
      return '_gte';
    case 'lt':
      return '_lt';
    case 'lte':
      return '_lte';
    case 'contains':
      return '_ilike';
    case 'startsWith':
      return '_starts_with';
    case 'endsWith':
      return '_ends_with';
    case 'in':
      return '_in';
    case 'between':
      return '_between';
    case 'isNull':
      return '_is_null';
    case 'isNotNull':
      return '_is_null';
    default:
      return '_eq';
  }
}

function opToREST(op: FilterCondition['operator']): string {
  switch (op) {
    case 'eq':
      return '';
    case 'neq':
      return '_neq';
    case 'gt':
      return '_gt';
    case 'gte':
      return '_gte';
    case 'lt':
      return '_lt';
    case 'lte':
      return '_lte';
    case 'contains':
      return '_contains';
    case 'startsWith':
      return '_starts';
    case 'endsWith':
      return '_ends';
    case 'in':
      return '_in';
    case 'between':
      return '_between';
    case 'isNull':
      return '_is_null';
    case 'isNotNull':
      return '_not_null';
    default:
      return '';
  }
}

// ==================== QueryBuilder ====================

/** 查询构建器 */
export class QueryBuilder {
  private entity: string;
  private operationName: string;
  private selection: FieldSelection = {};
  private filters: FilterCondition[] = [];
  private sorts: SortField[] = [];
  private pagination: PaginationParams | null = null;
  private relations: IncludeRelation[] = [];
  private useRest = false;

  constructor(entity: string, opts?: { operationName?: string; rest?: boolean }) {
    this.entity = entity;
    this.operationName = opts?.operationName ?? `List${capitalize(entity)}`;
    this.useRest = opts?.rest ?? false;
  }

  /** 选择字段 */
  select(fields: FieldSelection): this {
    this.selection = { ...this.selection, ...fields };
    return this;
  }

  /** 添加过滤条件 */
  where(condition: FilterCondition): this {
    this.filters.push(condition);
    return this;
  }

  /** 添加排序 */
  orderBy(field: string, direction: SortField['direction'] = 'asc'): this {
    this.sorts.push({ field, direction });
    return this;
  }

  /** 设置分页 */
  page(page: number, pageSize: number): this {
    this.pagination = { page, pageSize };
    return this;
  }

  /** 添加关联 */
  include(relation: IncludeRelation): this {
    this.relations.push(relation);
    return this;
  }

  /** 构建查询 */
  build(): BuiltQuery {
    return this.useRest ? this.buildRest() : this.buildGraphQL();
  }

  private buildGraphQL(): BuiltQuery {
    const vars: Record<string, unknown> = {};
    const whereArgs: string[] = [];

    this.filters.forEach((f, i) => {
      const varName = `w${i}`;
      if (f.operator === 'isNull') {
        whereArgs.push(`${f.field}: { ${opToGraphql(f.operator)}: ${f.operator === 'isNull' ? 'true' : 'false'} }`);
        return;
      }
      const varPath = `${varName}_value`;
      vars[varPath] = f.operator === 'contains'
        ? `%${f.value}%`
        : f.operator === 'startsWith'
          ? `${f.value}%`
          : f.value;
      whereArgs.push(`${f.field}: { ${opToGraphql(f.operator)}: $${varPath} }`);
    });

    const sortArgs = this.sorts
      .map((s) => `${s.field}: ${s.direction.toUpperCase()}`)
      .join(', ');

    const paginationArgs = this.pagination
      ? `limit: $limit, offset: $offset`
      : '';

    const selectionStr = fieldSelectionToList(this.selection).join('\n      ');
    const relationStr = this.relations
      .map((r) => {
        const sub = r.fields ? fieldSelectionToList(r.fields).join('\n        ') : '';
        const nested = r.nested
          ? r.nested
              .map((n) => {
                const nsub = n.fields ? fieldSelectionToList(n.fields).join('\n          ') : '';
                return `${n.relation} {\n          ${nsub}\n        }`;
              })
              .join('\n        ')
          : '';
        return `${r.relation} {\n        ${sub}${nested ? `\n        ${nested}` : ''}\n      }`;
      })
      .join('\n      ');

    if (this.pagination) {
      vars.limit = this.pagination.pageSize;
      vars.offset = (this.pagination.page - 1) * this.pagination.pageSize;
    }

    const query = `
  query ${this.operationName}${this.pagination ? '($limit: Int, $offset: Int)' : ''} {
    ${this.entity}${whereArgs.length ? `(where: { ${whereArgs.join(', ')} })` : ''}${sortArgs ? `(order_by: { ${sortArgs} })` : ''}${paginationArgs ? `(${paginationArgs})` : ''} {
      ${selectionStr}
      ${relationStr}
    }
  }`.trim();

    return { query, variables: vars, operationName: this.operationName };
  }

  private buildRest(): BuiltQuery {
    const params: string[] = [];
    this.filters.forEach((f) => {
      const suffix = opToREST(f.operator);
      const key = suffix ? `${f.field}${suffix}` : f.field;
      if (f.operator === 'isNull' || f.operator === 'isNotNull') {
        params.push(`${key}=${f.operator === 'isNull' ? 'true' : 'false'}`);
        return;
      }
      params.push(`${key}=${encodeURIComponent(String(f.operator === 'contains' ? `%${f.value}%` : f.value ?? ''))}`);
    });
    this.sorts.forEach((s) => params.push(`sort=${s.field}:${s.direction}`));
    if (this.pagination) {
      params.push(`page=${this.pagination.page}`);
      params.push(`page_size=${this.pagination.pageSize}`);
    }
    return {
      query: `${this.entity}?${params.join('&')}`,
      variables: {},
      operationName: this.operationName,
    };
  }
}

// ==================== MutationBuilder ====================

type MutationKind = 'insert' | 'update' | 'delete';

/** 变更构建器 */
export class MutationBuilder<T extends Record<string, unknown> = Record<string, unknown>> {
  private entity: string;
  private kind: MutationKind;
  private payload: Partial<T> = {};
  private idField = 'id';
  private operationName: string;

  constructor(entity: string, kind: MutationKind) {
    this.entity = entity;
    this.kind = kind;
    this.operationName =
      kind === 'insert'
        ? `Insert${capitalize(entity)}`
        : kind === 'update'
          ? `Update${capitalize(entity)}`
          : `Delete${capitalize(entity)}`;
  }

  /** 设置变更载荷 */
  data(payload: Partial<T>): this {
    this.payload = { ...this.payload, ...payload };
    return this;
  }

  /** 设置主键字段名 */
  idKey(field: string): this {
    this.idField = field;
    return this;
  }

  /** 构建变更 */
  build(): BuiltQuery {
    const vars: Record<string, unknown> = {};
    const keys = Object.keys(this.payload);

    if (this.kind === 'insert') {
      const fieldList = keys.join(', ');
      const valueList = keys.map((k) => `$${k}`).join(', ');
      keys.forEach((k) => (vars[k] = this.payload[k]));
      const query = `
  mutation ${this.operationName} {
    insert_${this.entity}_one(object: { ${fieldList}: { ${valueList} } }) {
      id
    }
  }`.trim();
      return { query, variables: vars, operationName: this.operationName };
    }

    if (this.kind === 'update') {
      const setList = keys.map((k) => `${k}: $${k}`).join(', ');
      keys.forEach((k) => (vars[k] = this.payload[k]));
      vars[this.idField] = this.payload[this.idField];
      const query = `
  mutation ${this.operationName}($id: uuid!) {
    update_${this.entity}_by_pk(pk_columns: { ${this.idField}: $id }, _set: { ${setList} }) {
      id
    }
  }`.trim();
      return { query, variables: vars, operationName: this.operationName };
    }

    // delete
    vars[this.idField] = this.payload[this.idField];
    const query = `
  mutation ${this.operationName}($id: uuid!) {
    delete_${this.entity}_by_pk(${this.idField}: $id) {
      id
    }
  }`.trim();
    return { query, variables: vars, operationName: this.operationName };
  }
}

// ==================== 查询模板 ====================

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** 常用查询模板 */
export const queryTemplates = {
  /** 列表查询（id + 指定字段） */
  list: (entity: string, fields: FieldSelection, pagination?: PaginationParams): BuiltQuery =>
    new QueryBuilder(entity, { operationName: `List${capitalize(entity)}` })
      .select({ id: true, ...fields })
      .page(pagination?.page ?? 1, pagination?.pageSize ?? 20)
      .build(),

  /** 详情查询（id 定位） */
  detail: (entity: string, fields: FieldSelection, id: unknown): BuiltQuery =>
    new QueryBuilder(entity, { operationName: `Get${capitalize(entity)}` })
      .select({ id: true, ...fields })
      .where({ field: 'id', operator: 'eq', value: id })
      .build(),

  /** 关联查询（主表 + 关联） */
  related: (entity: string, fields: FieldSelection, relation: IncludeRelation): BuiltQuery =>
    new QueryBuilder(entity, { operationName: `List${capitalize(entity)}With${capitalize(relation.relation)}` })
      .select({ id: true, ...fields })
      .include(relation)
      .build(),
};

export default QueryBuilder;
