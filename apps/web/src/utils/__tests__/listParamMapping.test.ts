import { describe, it, expect } from 'vitest';
import {
  mapListParamsToBackend,
  parsePaginationFromResponse,
  buildStandardFilterParams,
  buildNestedFilterArray,
  serializeFiltersToUrl,
  parseFiltersFromUrl,
  topemsStandardParams,
  nestedFilterParams,
  offsetStyleParams,
  type ListStateParams,
} from '../listParamMapping';

const baseState: ListStateParams = {
  search: '',
  sortBy: '',
  sortOrder: 'asc',
  page: 1,
  pageSize: 20,
  filters: {},
};

describe('utils/listParamMapping - mapListParamsToBackend', () => {
  describe('standard style (default)', () => {
    it('maps page, pageSize, search, sort, filters flat', () => {
      const result = mapListParamsToBackend({
        ...baseState,
        search: 'alice',
        sortBy: 'name',
        sortOrder: 'desc',
        filters: { status: 'active', dept: 'eng' },
      });
      expect(result).toEqual({
        page: 1,
        pagesize: 20,
        keyword: 'alice',
        sortBy: 'name',
        sortOrder: 'desc',
        status: 'active',
        dept: 'eng',
      });
    });

    it('omits search when empty', () => {
      const result = mapListParamsToBackend(baseState);
      expect(result).toEqual({ page: 1, pagesize: 20 });
      expect(result).not.toHaveProperty('keyword');
    });

    it('omits sort when sortBy is empty', () => {
      const result = mapListParamsToBackend({ ...baseState, sortBy: '' });
      expect(result).not.toHaveProperty('sortBy');
      expect(result).not.toHaveProperty('sortOrder');
    });

    it('skips null/undefined/empty filter values', () => {
      const result = mapListParamsToBackend({
        ...baseState,
        filters: { a: 'val', b: null, c: undefined, d: '' },
      });
      expect(result).toEqual({ page: 1, pagesize: 20, a: 'val' });
    });
  });

  describe('nested style', () => {
    it('wraps filters in filters object and sort in sort object', () => {
      const result = mapListParamsToBackend(
        {
          ...baseState,
          search: 'bob',
          sortBy: 'createdAt',
          sortOrder: 'asc',
          filters: { status: 'pending' },
        },
        { style: 'nested' }
      );
      expect(result).toEqual({
        page: 1,
        pagesize: 20,
        keyword: 'bob',
        filters: { status: 'pending' },
        sort: { field: 'createdAt', order: 'asc' },
      });
    });

    it('omits filters object when no valid filters', () => {
      const result = mapListParamsToBackend(baseState, { style: 'nested' });
      expect(result).not.toHaveProperty('filters');
    });

    it('omits sort object when no sortBy', () => {
      const result = mapListParamsToBackend({ ...baseState, sortBy: '' }, { style: 'nested' });
      expect(result).not.toHaveProperty('sort');
    });
  });

  describe('offset style', () => {
    it('converts page/pagesize to offset/limit', () => {
      const result = mapListParamsToBackend(
        { ...baseState, page: 3, pageSize: 25 },
        { style: 'offset' }
      );
      expect(result).toEqual({ offset: 50, pagesize: 25 });
    });

    it('includes sort and filters flat', () => {
      const result = mapListParamsToBackend(
        {
          ...baseState,
          page: 2,
          pageSize: 10,
          sortBy: 'name',
          sortOrder: 'desc',
          filters: { status: 'active' },
        },
        { style: 'offset' }
      );
      expect(result).toEqual({
        offset: 10,
        pagesize: 10,
        sortBy: 'name',
        sortOrder: 'desc',
        status: 'active',
      });
    });

    it('handles page=1 (offset=0)', () => {
      const result = mapListParamsToBackend(
        { ...baseState, page: 1, pageSize: 20 },
        { style: 'offset' }
      );
      expect(result).toEqual({ offset: 0, pagesize: 20 });
    });
  });

  describe('custom options', () => {
    it('uses custom param names', () => {
      const result = mapListParamsToBackend(
        { ...baseState, sortBy: 'name', sortOrder: 'asc', search: 'x' },
        {
          searchParamName: 'q',
          pageParamName: 'pageNum',
          pageSizeParamName: 'perPage',
        }
      );
      expect(result).toEqual({
        pageNum: 1,
        perPage: 20,
        q: 'x',
        sortBy: 'name',
        sortOrder: 'asc',
      });
    });

    it('uses fieldMapping for filter keys and sort field', () => {
      const result = mapListParamsToBackend(
        {
          ...baseState,
          sortBy: 'name',
          sortOrder: 'asc',
          filters: { status: 'active', type: 'A' },
        },
        { fieldMapping: { name: 'full_name', status: 'stat' } }
      );
      expect(result).toEqual({
        page: 1,
        pagesize: 20,
        sortBy: 'full_name',
        sortOrder: 'asc',
        stat: 'active',
        type: 'A',
      });
    });

    it('uses custom sortOrderValues', () => {
      const result = mapListParamsToBackend(
        { ...baseState, sortBy: 'name', sortOrder: 'desc' },
        { sortOrderValues: { asc: 'ASC', desc: 'DESC' } }
      );
      expect(result.sortOrder).toBe('DESC');
    });

    it('uses offset-style custom names', () => {
      const result = mapListParamsToBackend(
        { ...baseState, page: 2, pageSize: 10 },
        {
          style: 'offset',
          offsetParamName: 'skip',
          pageSizeParamName: 'limit',
        }
      );
      expect(result).toEqual({ skip: 10, limit: 10 });
    });
  });
});

describe('utils/listParamMapping - parsePaginationFromResponse', () => {
  it('parses standard response with items', () => {
    const result = parsePaginationFromResponse({
      data: { items: [{ id: 1 }], total: 100, page: 2, pagesize: 10 },
    });
    expect(result).toEqual({ items: [{ id: 1 }], total: 100, page: 2, pageSize: 10 });
  });

  it('parses response with list key', () => {
    const result = parsePaginationFromResponse({
      data: { list: [{ id: 1 }], total: 50, page: 1, pagesize: 20 },
    });
    expect(result.items).toEqual([{ id: 1 }]);
    expect(result.total).toBe(50);
  });

  it('parses response with records key', () => {
    const result = parsePaginationFromResponse({
      data: { records: [{ id: 1 }], total: 30, current: 3, size: 5 },
    });
    expect(result.items).toEqual([{ id: 1 }]);
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(5);
  });

  it('parses response with rows key', () => {
    const result = parsePaginationFromResponse({
      data: { rows: [{ id: 1 }], total: 10 },
    });
    expect(result.items).toEqual([{ id: 1 }]);
  });

  it('handles response where data is an array (items defaults to [])', () => {
    const result = parsePaginationFromResponse({
      data: [{ id: 1 }],
      total: 1,
    });
    // When response.data is an array, it becomes `data`, but arrays don't have
    // .items/.list/.records/.rows properties, so items defaults to []
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0); // data.total (array.total) is undefined -> 0
  });

  it('provides defaults for missing fields', () => {
    const result = parsePaginationFromResponse({});
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 10 });
  });

  it('falls back to pageSize=10 when only pageSize is missing', () => {
    const result = parsePaginationFromResponse({
      data: { items: [], total: 0, page: 1 },
    });
    expect(result.pageSize).toBe(10);
  });
});

describe('utils/listParamMapping - buildStandardFilterParams', () => {
  it('passes through simple object filters', () => {
    const result = buildStandardFilterParams({ status: 'active', type: 'A' });
    expect(result).toEqual({ status: 'active', type: 'A' });
  });

  it('skips null/undefined/empty values in simple object', () => {
    const result = buildStandardFilterParams({
      a: 'val',
      b: null,
      c: undefined,
      d: '',
    });
    expect(result).toEqual({ a: 'val' });
  });

  it('handles FilterCondition array with eq operator', () => {
    const result = buildStandardFilterParams([{ field: 'status', op: 'eq', value: 'active' }]);
    expect(result).toEqual({ status: 'active' });
  });

  it('handles gt, gte, lt, lte operators with field_op format', () => {
    const result = buildStandardFilterParams([
      { field: 'age', op: 'gt', value: 18 },
      { field: 'score', op: 'gte', value: 60 },
      { field: 'price', op: 'lt', value: 100 },
      { field: 'weight', op: 'lte', value: 50 },
    ]);
    expect(result).toEqual({
      age_gt: 18,
      score_gte: 60,
      price_lt: 100,
      weight_lte: 50,
    });
  });

  it('handles like operator', () => {
    const result = buildStandardFilterParams([{ field: 'name', op: 'like', value: '%john%' }]);
    expect(result).toEqual({ name_like: '%john%' });
  });

  it('handles in/nin operators by joining arrays', () => {
    const result = buildStandardFilterParams([
      { field: 'tags', op: 'in', value: ['a', 'b', 'c'] },
      { field: 'excluded', op: 'nin', value: ['x'] },
    ]);
    expect(result).toEqual({ tags_in: 'a,b,c', excluded_nin: 'x' });
  });

  it('handles between operator', () => {
    const result = buildStandardFilterParams([{ field: 'price', op: 'between', value: [10, 100] }]);
    expect(result).toEqual({ price_between: '10,100' });
  });

  it('handles null operator', () => {
    const result = buildStandardFilterParams([
      { field: 'deletedAt', op: 'null', value: undefined },
    ]);
    expect(result).toEqual({ deletedAt: null });
  });

  it('handles notnull operator', () => {
    const result = buildStandardFilterParams([{ field: 'email', op: 'notnull', value: undefined }]);
    expect(result).toEqual({ email_notnull: true });
  });

  it('applies fieldMapping', () => {
    const result = buildStandardFilterParams([{ field: 'name', op: 'eq', value: 'Alice' }], {
      fieldMapping: { name: 'full_name' },
    });
    expect(result).toEqual({ full_name: 'Alice' });
  });

  it('uses custom opSeparator', () => {
    const result = buildStandardFilterParams([{ field: 'age', op: 'gt', value: 18 }], {
      opSeparator: '__',
    });
    expect(result).toEqual({ age__gt: 18 });
  });

  it('uses custom valueSeparator for in/nin', () => {
    const result = buildStandardFilterParams([{ field: 'tags', op: 'in', value: ['a', 'b'] }], {
      valueSeparator: '|',
    });
    expect(result).toEqual({ tags_in: 'a|b' });
  });

  it('handles FilterGroup with nested conditions', () => {
    const result = buildStandardFilterParams({
      logic: 'and',
      conditions: [
        { field: 'status', op: 'eq', value: 'active' },
        {
          logic: 'and',
          conditions: [{ field: 'age', op: 'gt', value: 18 }],
        },
      ],
    });
    expect(result).toEqual({ status: 'active', age_gt: 18 });
  });
});

describe('utils/listParamMapping - buildNestedFilterArray', () => {
  it('converts simple object to FilterCondition array', () => {
    const result = buildNestedFilterArray({ status: 'active', type: 'A' });
    expect(result).toEqual([
      { field: 'status', op: 'eq', value: 'active' },
      { field: 'type', op: 'eq', value: 'A' },
    ]);
  });

  it('skips null/undefined/empty values', () => {
    const result = buildNestedFilterArray({ a: 'val', b: null, c: '', d: undefined });
    expect(result).toEqual([{ field: 'a', op: 'eq', value: 'val' }]);
  });

  it('passes through FilterCondition array with fieldMapping', () => {
    const result = buildNestedFilterArray(
      [
        { field: 'name', op: 'gt', value: 18 },
        { field: 'status', op: 'eq', value: 'active' },
      ],
      { fieldMapping: { name: 'full_name' } }
    );
    expect(result).toEqual([
      { field: 'full_name', op: 'gt', value: 18 },
      { field: 'status', op: 'eq', value: 'active' },
    ]);
  });
});

describe('utils/listParamMapping - serializeFiltersToUrl / parseFiltersFromUrl', () => {
  describe('serializeFiltersToUrl', () => {
    it('prefixes keys with f_ and stringifies values', () => {
      const result = serializeFiltersToUrl({ status: 'active', type: 'A' });
      expect(result).toEqual({ f_status: 'active', f_type: 'A' });
    });

    it('skips null/undefined/empty values', () => {
      const result = serializeFiltersToUrl({
        a: 'val',
        b: null,
        c: undefined,
        d: '',
      });
      expect(result).toEqual({ f_a: 'val' });
    });

    it('JSON-stringifies object values', () => {
      const result = serializeFiltersToUrl({ tags: ['a', 'b'] });
      expect(result).toEqual({ f_tags: '["a","b"]' });
    });

    it('uses custom prefix', () => {
      const result = serializeFiltersToUrl({ status: 'active' }, 'filter_');
      expect(result).toEqual({ filter_status: 'active' });
    });
  });

  describe('parseFiltersFromUrl', () => {
    it('parses string values from URLSearchParams', () => {
      const params = new URLSearchParams('f_status=active&f_type=A');
      const result = parseFiltersFromUrl(params);
      expect(result).toEqual({ status: 'active', type: 'A' });
    });

    it('merges with defaultFilters', () => {
      const params = new URLSearchParams('f_status=active');
      const result = parseFiltersFromUrl(params, 'f_', {
        status: 'default',
        type: 'A',
      });
      expect(result).toEqual({ status: 'active', type: 'A' });
    });

    it('converts values to number when default is number', () => {
      const params = new URLSearchParams('f_age=25');
      const result = parseFiltersFromUrl(params, 'f_', { age: 0 });
      expect(result).toEqual({ age: 25 });
    });

    it('falls back to default when number parse fails', () => {
      const params = new URLSearchParams('f_age=abc');
      const result = parseFiltersFromUrl(params, 'f_', { age: 0 });
      expect(result).toEqual({ age: 0 });
    });

    it('converts values to boolean when default is boolean', () => {
      const params = new URLSearchParams('f_active=true&f_disabled=false');
      const result = parseFiltersFromUrl(params, 'f_', {
        active: false,
        disabled: true,
      });
      expect(result).toEqual({ active: true, disabled: false });
    });

    it('parses array values via JSON when default is array', () => {
      const params = new URLSearchParams('f_tags=%5B%22a%22%2C%22b%22%5D');
      const result = parseFiltersFromUrl(params, 'f_', { tags: [] });
      expect(result).toEqual({ tags: ['a', 'b'] });
    });

    it('falls back to comma-split when JSON parse fails for arrays', () => {
      const params = new URLSearchParams('f_tags=a,b,c');
      const result = parseFiltersFromUrl(params, 'f_', { tags: [] });
      expect(result).toEqual({ tags: ['a', 'b', 'c'] });
    });

    it('ignores params without prefix', () => {
      const params = new URLSearchParams('status=active&f_type=A');
      const result = parseFiltersFromUrl(params);
      expect(result).toEqual({ type: 'A' });
    });

    it('uses custom prefix', () => {
      const params = new URLSearchParams('filter_status=active');
      const result = parseFiltersFromUrl(params, 'filter_');
      expect(result).toEqual({ status: 'active' });
    });
  });
});

describe('utils/listParamMapping - preset configs', () => {
  it('topemsStandardParams has correct defaults', () => {
    expect(topemsStandardParams.style).toBe('standard');
    expect(topemsStandardParams.searchParamName).toBe('keyword');
    expect(topemsStandardParams.pageSizeParamName).toBe('pagesize');
  });

  it('nestedFilterParams has correct defaults', () => {
    expect(nestedFilterParams.style).toBe('nested');
    expect(nestedFilterParams.sortOrderKey).toBe('direction');
    expect(nestedFilterParams.sortOrderValues).toEqual({ asc: 'ASC', desc: 'DESC' });
  });

  it('offsetStyleParams has correct defaults', () => {
    expect(offsetStyleParams.style).toBe('offset');
    expect(offsetStyleParams.pageSizeParamName).toBe('limit');
    expect(offsetStyleParams.sortOrderValues).toEqual({ asc: '1', desc: '-1' });
  });

  it('presets can be used with mapListParamsToBackend', () => {
    const result = mapListParamsToBackend(
      { ...baseState, page: 2, pageSize: 10 },
      offsetStyleParams
    );
    expect(result).toEqual({ offset: 10, limit: 10 });
  });
});
