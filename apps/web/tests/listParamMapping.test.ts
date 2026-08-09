import { describe, it, expect } from 'vitest';
import {
  mapListParamsToBackend,
  parsePaginationFromResponse,
  topemsStandardParams,
  nestedFilterParams,
  offsetStyleParams,
  buildStandardFilterParams,
  buildNestedFilterArray,
  serializeFiltersToUrl,
  parseFiltersFromUrl,
  FILTER_URL_PREFIX,
} from '@/utils/listParamMapping';

describe('utils/listParamMapping - mapListParamsToBackend standard 风格', () => {
  const baseState = {
    search: '',
    sortBy: '',
    sortOrder: 'asc' as const,
    page: 1,
    pageSize: 20,
    filters: {},
  };

  it('standard 风格分页平铺', () => {
    const result = mapListParamsToBackend({ ...baseState, page: 2, pageSize: 50 });
    expect(result.page).toBe(2);
    expect(result.pagesize).toBe(50);
  });

  it('standard 风格搜索字段默认 keyword', () => {
    const result = mapListParamsToBackend({ ...baseState, search: 'abc' });
    expect(result.keyword).toBe('abc');
  });

  it('standard 风格筛选字段平铺', () => {
    const result = mapListParamsToBackend({ ...baseState, filters: { status: 'active', type: 'vip' } });
    expect(result.status).toBe('active');
    expect(result.type).toBe('vip');
  });

  it('standard 风格排序字段', () => {
    const result = mapListParamsToBackend({ ...baseState, sortBy: 'createdAt', sortOrder: 'desc' });
    expect(result.sortBy).toBe('createdAt');
    expect(result.sortOrder).toBe('desc');
  });

  it('standard 风格空字符串/undefined/null 的 filters 项被剔除', () => {
    const result = mapListParamsToBackend({
      ...baseState,
      filters: { a: '', b: undefined, c: null, d: 'ok' },
    });
    expect((result as Record<string, unknown>).a).toBeUndefined();
    expect((result as Record<string, unknown>).b).toBeUndefined();
    expect((result as Record<string, unknown>).c).toBeUndefined();
    expect(result.d).toBe('ok');
  });
});

describe('utils/listParamMapping - mapListParamsToBackend nested 风格', () => {
  const baseState = {
    search: 'x',
    sortBy: 'name',
    sortOrder: 'asc' as const,
    page: 1,
    pageSize: 20,
    filters: { status: 'ok' },
  };

  it('nested 风格 filters 与 sort 放在嵌套对象', () => {
    const result = mapListParamsToBackend(baseState, nestedFilterParams);
    expect(result.page).toBe(1);
    expect(result.pagesize).toBe(20);
    expect(result.keyword).toBe('x');
    const filters = result.filters as Record<string, unknown>;
    expect(filters.status).toBe('ok');
    const sort = result.sort as Record<string, unknown>;
    expect(sort.field).toBe('name');
    expect(sort.direction).toBe('ASC');
  });

  it('nested 风格无 filters 时不产生 filters 键', () => {
    const result = mapListParamsToBackend({ ...baseState, filters: {} }, nestedFilterParams);
    expect((result as Record<string, unknown>).filters).toBeUndefined();
  });
});

describe('utils/listParamMapping - mapListParamsToBackend offset 风格', () => {
  const baseState = {
    search: 'x',
    sortBy: 'id',
    sortOrder: 'asc' as const,
    page: 3,
    pageSize: 50,
    filters: {},
  };

  it('offset 风格 page/pagesize -> offset/limit', () => {
    const result = mapListParamsToBackend(baseState, offsetStyleParams);
    expect(result.offset).toBe((3 - 1) * 50);
    expect(result.limit).toBe(50);
  });
});

describe('utils/listParamMapping - parsePaginationFromResponse', () => {
  it('items/total/page/pagesize 正常解析', () => {
    const result = parsePaginationFromResponse({ items: [1, 2], total: 100, page: 2, pagesize: 20 });
    expect(result.items).toEqual([1, 2]);
    expect(result.total).toBe(100);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(20);
  });

  it('别名 list/records/rows 兼容', () => {
    expect(parsePaginationFromResponse({ list: [1], total: 10 }).items).toEqual([1]);
    expect(parsePaginationFromResponse({ records: [1], total: 10 }).items).toEqual([1]);
    expect(parsePaginationFromResponse({ rows: [1], total: 10 }).items).toEqual([1]);
  });

  it('page/current/size/pageSize 别名兼容', () => {
    const r1 = parsePaginationFromResponse({ current: 3, size: 40, total: 1 });
    expect(r1.page).toBe(3);
    expect(r1.pageSize).toBe(40);
    const r2 = parsePaginationFromResponse({ pageSize: 25, total: 1 });
    expect(r2.pageSize).toBe(25);
  });

  it('包装在 data 字段里也可解析', () => {
    const result = parsePaginationFromResponse({ data: { list: [1], total: 99 } });
    expect(result.items).toEqual([1]);
    expect(result.total).toBe(99);
  });
});

describe('utils/listParamMapping - buildStandardFilterParams', () => {
  it('简单对象直接平铺', () => {
    const r = buildStandardFilterParams({ status: 'active', age: 18 });
    expect(r.status).toBe('active');
    expect(r.age).toBe(18);
  });

  it('FilterCondition eq 直接写 field:value', () => {
    const r = buildStandardFilterParams([{ field: 'status', op: 'eq', value: 'ok' }]);
    expect(r.status).toBe('ok');
  });

  it('FilterCondition 其他操作符使用后缀', () => {
    const r = buildStandardFilterParams([
      { field: 'age', op: 'gt', value: 18 },
      { field: 'tags', op: 'in', value: ['a', 'b'] },
    ]);
    expect(r.age_gt).toBe(18);
    expect(r.tags_in).toBe('a,b');
  });

  it('fieldMapping 支持字段名转换', () => {
    const r = buildStandardFilterParams({ userAge: 20 }, { fieldMapping: { userAge: 'age' } });
    expect(r.age).toBe(20);
    expect((r as Record<string, unknown>).userAge).toBeUndefined();
  });
});

describe('utils/listParamMapping - buildNestedFilterArray', () => {
  it('对象形式转 FilterCondition 数组（默认 eq）', () => {
    const r = buildNestedFilterArray({ status: 'active' });
    expect(r).toHaveLength(1);
    expect(r[0].field).toBe('status');
    expect(r[0].op).toBe('eq');
    expect(r[0].value).toBe('active');
  });

  it('数组形式保留并做 fieldMapping', () => {
    const r = buildNestedFilterArray(
      [{ field: 'userStatus', op: 'ne', value: 'deleted' }],
      { fieldMapping: { userStatus: 'status' } }
    );
    expect(r[0].field).toBe('status');
    expect(r[0].op).toBe('ne');
  });
});

describe('utils/listParamMapping - URL 序列化/反序列化', () => {
  it('serializeFiltersToUrl 加前缀并转字符串', () => {
    const r = serializeFiltersToUrl({ status: 'active', page: 2 });
    expect(r[`${FILTER_URL_PREFIX}status`]).toBe('active');
    expect(r[`${FILTER_URL_PREFIX}page`]).toBe('2');
  });

  it('parseFiltersFromUrl 能读取带前缀的参数（按 defaultFilters 类型转换）', () => {
    const sp = new URLSearchParams();
    sp.set(`${FILTER_URL_PREFIX}status`, 'active');
    sp.set(`${FILTER_URL_PREFIX}limit`, '50');
    sp.set(`${FILTER_URL_PREFIX}enabled`, 'true');
    const defaults: Record<string, unknown> = { limit: 10, enabled: false };
    const r = parseFiltersFromUrl(sp, FILTER_URL_PREFIX, defaults);
    expect(r.status).toBe('active');
    expect(r.limit).toBe(50);
    expect(r.enabled).toBe(true);
  });
});

describe('utils/listParamMapping - 预设配置对象', () => {
  it('topemsStandardParams style=standard', () => {
    expect(topemsStandardParams.style).toBe('standard');
  });
  it('nestedFilterParams style=nested', () => {
    expect(nestedFilterParams.style).toBe('nested');
  });
  it('offsetStyleParams style=offset', () => {
    expect(offsetStyleParams.style).toBe('offset');
  });
});
