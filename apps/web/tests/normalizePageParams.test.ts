import { describe, it, expect } from 'vitest';
import { normalizePageParams, normalizeObjectKeysDeep } from '@/utils/normalizePageParams';

describe('utils/normalizePageParams - normalizePageParams', () => {
  it('空对象应返回空对象', () => {
    expect(normalizePageParams({})).toEqual({});
  });

  it('pageSize 驼峰应转为 page_size 下划线', () => {
    const result = normalizePageParams({ page: 1, pageSize: 50 });
    expect(result.page).toBe(1);
    expect(result.page_size).toBe(50);
    expect((result as Record<string, unknown>).pageSize).toBeUndefined();
  });

  it('pagesize 小写应转为 page_size', () => {
    const result = normalizePageParams({ pagesize: 20 });
    expect(result.page_size).toBe(20);
  });

  it('sortBy -> sort_by, sortOrder -> sort_order', () => {
    const result = normalizePageParams({ sortBy: 'name', sortOrder: 'asc' });
    expect(result.sort_by).toBe('name');
    expect(result.sort_order).toBe('asc');
  });

  it('undefined / null 值应被过滤', () => {
    const result = normalizePageParams({
      page: 1,
      pageSize: undefined,
      keyword: null,
      status: 'active',
    });
    expect(result.page).toBe(1);
    expect((result as Record<string, unknown>).pageSize).toBeUndefined();
    expect((result as Record<string, unknown>).keyword).toBeUndefined();
    expect(result.status).toBe('active');
  });

  it('其他字段原样保留', () => {
    const result = normalizePageParams({ customField: 'hello' });
    expect(result.customField).toBe('hello');
  });
});

describe('utils/normalizePageParams - normalizeObjectKeysDeep', () => {
  it('普通对象浅度转换', () => {
    const result = normalizeObjectKeysDeep({ pageSize: 10, sortBy: 'id' });
    expect(result.page_size).toBe(10);
    expect(result.sort_by).toBe('id');
  });

  it('嵌套对象应递归转换 (默认 depth=3)', () => {
    const input = {
      outer: {
        pageSize: 20,
        inner: {
          sortBy: 'createdAt',
        },
      },
    };
    const result = normalizeObjectKeysDeep(input);
    expect((result.outer as Record<string, unknown>).page_size).toBe(20);
    const inner = (result.outer as Record<string, unknown>).inner as Record<string, unknown>;
    expect(inner.sort_by).toBe('createdAt');
  });

  it('depth <= 0 时应直接返回输入（不转换）', () => {
    const input = { pageSize: 10 };
    const result = normalizeObjectKeysDeep(input, 0);
    expect((result as Record<string, unknown>).pageSize).toBe(10);
  });

  it('数组不应递归转换', () => {
    const input = { items: [{ pageSize: 10 }] };
    const result = normalizeObjectKeysDeep(input);
    const items = result.items as unknown[];
    expect(Array.isArray(items)).toBe(true);
    expect((items[0] as Record<string, unknown>).pageSize).toBe(10);
  });

  it('undefined/null 值过滤', () => {
    const result = normalizeObjectKeysDeep({ a: undefined, b: null, c: 1 });
    expect((result as Record<string, unknown>).a).toBeUndefined();
    expect((result as Record<string, unknown>).b).toBeUndefined();
    expect(result.c).toBe(1);
  });
});
