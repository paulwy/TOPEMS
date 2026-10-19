import { describe, it, expect } from 'vitest';
import { QueryBuilder, MutationBuilder, queryTemplates } from '../bff/queryBuilder';

// ==================== QueryBuilder (GraphQL, default) ====================

describe('QueryBuilder 默认 GraphQL 构建', () => {
  it('默认操作名为 List{Capitalize(entity)}，无过滤/分页时不产出变量', () => {
    const q = new QueryBuilder('users').select({ id: true, name: true }).build();

    expect(q.operationName).toBe('ListUsers');
    expect(q.query).toContain('query ListUsers');
    expect(q.query).toContain('users');
    expect(q.query).toContain('id');
    expect(q.query).toContain('name');
    expect(q.variables).toEqual({});
  });

  it('eq 过滤映射为 _eq 并把值写入变量 w0_value', () => {
    const q = new QueryBuilder('users')
      .where({ field: 'email', operator: 'eq', value: 'a@b.com' })
      .build();

    expect(q.query).toContain('email: { _eq: $w0_value }');
    expect(q.variables).toEqual({ w0_value: 'a@b.com' });
  });

  it('contains 包装 %value% 并使用 _ilike 操作符', () => {
    const q = new QueryBuilder('users')
      .where({ field: 'name', operator: 'contains', value: '张' })
      .build();

    expect(q.query).toContain('name: { _ilike: $w0_value }');
    expect(q.variables).toEqual({ w0_value: '%张%' });
  });

  it('startsWith 包装 value% 并使用 _starts_with 操作符', () => {
    const q = new QueryBuilder('users')
      .where({ field: 'code', operator: 'startsWith', value: 'IT' })
      .build();

    expect(q.query).toContain('_starts_with');
    expect(q.variables).toEqual({ w0_value: 'IT%' });
  });

  it('isNull 生成 _is_null: true 且不写入过滤变量', () => {
    const q = new QueryBuilder('users').where({ field: 'deleted_at', operator: 'isNull' }).build();

    expect(q.query).toContain('deleted_at: { _is_null: true }');
    expect(Object.keys(q.variables)).toHaveLength(0);
  });

  it('orderBy desc 输出大写 DESC', () => {
    const q = new QueryBuilder('users').orderBy('created_at', 'desc').build();
    expect(q.query).toContain('created_at: DESC');
  });

  it('分页第2页 pageSize20 → limit=20, offset=20 且声明 $limit/$offset', () => {
    const q = new QueryBuilder('users').page(2, 20).build();

    expect(q.variables.limit).toBe(20);
    expect(q.variables.offset).toBe(20);
    expect(q.query).toContain('($limit: Int, $offset: Int)');
    expect(q.query).toContain('limit: $limit, offset: $offset');
  });

  it('include 关联输出嵌套关系块', () => {
    const q = new QueryBuilder('users')
      .include({ relation: 'roles', fields: { code: true } })
      .build();

    expect(q.query).toContain('roles');
    expect(q.query).toContain('code');
  });
});

// ==================== QueryBuilder (REST) ====================

describe('QueryBuilder REST 模式', () => {
  it('eq 无后缀，contains 包 %value%，排序为 field:dir', () => {
    const q = new QueryBuilder('orders', { rest: true })
      .where({ field: 'status', operator: 'eq', value: 'paid' })
      .where({ field: 'title', operator: 'contains', value: 'ab' })
      .orderBy('created_at', 'desc')
      .build();

    expect(q.query).toContain('orders?');
    expect(q.query).toContain('status=paid');
    expect(q.query).toContain('title_contains=');
    expect(q.query).toContain('%25ab%25'); // %ab% 经 encodeURIComponent
    expect(q.query).toContain('sort=created_at:desc');
    expect(q.variables).toEqual({});
  });

  it('isNotNull 输出 _not_null=false 标志参数', () => {
    const q = new QueryBuilder('orders', { rest: true })
      .where({ field: 'deleted_at', operator: 'isNotNull' })
      .build();

    expect(q.query).toContain('deleted_at_not_null=false');
  });

  it('分页输出 page 与 page_size 参数', () => {
    const q = new QueryBuilder('orders', { rest: true }).page(3, 50).build();
    expect(q.query).toContain('page=3');
    expect(q.query).toContain('page_size=50');
  });
});

// ==================== MutationBuilder ====================

describe('MutationBuilder', () => {
  it('insert 生成 InsertX 操作名与 insert_x_one，载荷进变量', () => {
    const m = new MutationBuilder('category', 'insert').data({ name: '食品', sort: 1 }).build();

    expect(m.operationName).toBe('InsertCategory');
    expect(m.query).toContain('mutation InsertCategory');
    expect(m.query).toContain('insert_category_one');
    expect(m.variables).toEqual({ name: '食品', sort: 1 });
  });

  it('update 生成 update_x_by_pk 且主键并入变量', () => {
    const m = new MutationBuilder('category', 'update')
      .idKey('code')
      .data({ code: 'FOOD', name: '食品' })
      .build();

    expect(m.operationName).toBe('UpdateCategory');
    expect(m.query).toContain('update_category_by_pk');
    expect(m.variables.code).toBe('FOOD');
  });

  it('delete 生成 delete_x_by_pk 并携带主键', () => {
    const m = new MutationBuilder('category', 'delete').data({ id: 42 }).build();

    expect(m.operationName).toBe('DeleteCategory');
    expect(m.query).toContain('delete_category_by_pk(id: $id)');
    expect(m.variables.id).toBe(42);
  });
});

// ==================== queryTemplates ====================

describe('queryTemplates', () => {
  it('detail 生成 GetX 操作名并按 id eq 定位', () => {
    const q = queryTemplates.detail('product', { sku: true }, 7);
    expect(q.operationName).toBe('GetProduct');
    expect(q.query).toContain('id: { _eq: $w0_value }');
    expect(q.variables.w0_value).toBe(7);
  });

  it('list 默认 page=1 pageSize=20 且必选 id 字段', () => {
    const q = queryTemplates.list('product', { name: true });
    expect(q.variables.limit).toBe(20);
    expect(q.variables.offset).toBe(0);
    expect(q.query).toContain('id');
    expect(q.query).toContain('name');
  });
});
