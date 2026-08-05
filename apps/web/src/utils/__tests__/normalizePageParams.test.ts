import { describe, it, expect } from 'vitest';
import { normalizePageParams, normalizeObjectKeysDeep } from '../normalizePageParams';

describe('utils/normalizePageParams', () => {
  describe('normalizePageParams', () => {
    it('converts pageSize to page_size', () => {
      const result = normalizePageParams({ page: 1, pageSize: 20 });
      expect(result).toEqual({ page: 1, page_size: 20 });
    });

    it('converts pagesize (lowercase) to page_size', () => {
      const result = normalizePageParams({ page: 1, pagesize: 20 });
      expect(result).toEqual({ page: 1, page_size: 20 });
    });

    it('converts sortBy to sort_by', () => {
      const result = normalizePageParams({ sortBy: 'name' });
      expect(result).toEqual({ sort_by: 'name' });
    });

    it('converts sortOrder to sort_order', () => {
      const result = normalizePageParams({ sortOrder: 'desc' });
      expect(result).toEqual({ sort_order: 'desc' });
    });

    it('passes through unknown keys unchanged', () => {
      const result = normalizePageParams({ keyword: 'test', status: 'active', page: 1 });
      expect(result).toEqual({ keyword: 'test', status: 'active', page: 1 });
    });

    it('skips null values', () => {
      const result = normalizePageParams({ page: 1, pageSize: null as unknown as undefined });
      expect(result).toEqual({ page: 1 });
    });

    it('skips undefined values', () => {
      const result = normalizePageParams({ page: 1, pageSize: undefined });
      expect(result).toEqual({ page: 1 });
    });

    it('handles empty object', () => {
      expect(normalizePageParams({})).toEqual({});
    });

    it('handles all three conversions at once', () => {
      const result = normalizePageParams({
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'asc',
        keyword: 'abc',
      });
      expect(result).toEqual({
        page_size: 10,
        sort_by: 'createdAt',
        sort_order: 'asc',
        keyword: 'abc',
      });
    });

    it('preserves falsy values that are not null/undefined', () => {
      const result = normalizePageParams({ page: 0, pageSize: 0, keyword: '' });
      expect(result).toEqual({ page: 0, page_size: 0, keyword: '' });
    });
  });

  describe('normalizeObjectKeysDeep', () => {
    it('recursively converts nested objects', () => {
      const input = {
        page: 1,
        pageSize: 10,
        filter: { sortBy: 'name', sortOrder: 'asc', level: { pageSize: 5 } },
      };
      const result = normalizeObjectKeysDeep(input);
      expect(result).toEqual({
        page: 1,
        page_size: 10,
        filter: { sort_by: 'name', sort_order: 'asc', level: { page_size: 5 } },
      });
    });

    it('does not recurse into arrays', () => {
      const input = { items: [{ pageSize: 10 }], page: 1 };
      const result = normalizeObjectKeysDeep(input);
      expect(result).toEqual({ items: [{ pageSize: 10 }], page: 1 });
    });

    it('respects depth limit', () => {
      const input = {
        page_size: 1,
        level1: { page_size: 2, level2: { page_size: 3, level3: { pageSize: 4 } } },
      };
      const result = normalizeObjectKeysDeep(input, 2);
      // depth 2: converts top-level and one level down
      expect(result).toEqual({
        page_size: 1,
        level1: { page_size: 2, level2: { page_size: 3, level3: { pageSize: 4 } } },
      });
    });

    it('returns non-object values as-is', () => {
      expect(normalizeObjectKeysDeep(null as any)).toBeNull();
      expect(normalizeObjectKeysDeep('string' as any)).toBe('string');
      expect(normalizeObjectKeysDeep(42 as any)).toBe(42);
    });

    it('returns arrays as-is', () => {
      const arr = [{ pageSize: 10 }];
      const result = normalizeObjectKeysDeep(arr as any);
      expect(result).toBe(arr);
    });

    it('skips null/undefined values in nested objects', () => {
      const input = { page: 1, pageSize: null as unknown as undefined, name: 'test' };
      const result = normalizeObjectKeysDeep(input);
      expect(result).toEqual({ page: 1, name: 'test' });
    });

    it('handles depth=0 by returning input as-is', () => {
      const input = { pageSize: 10, sortBy: 'name' };
      const result = normalizeObjectKeysDeep(input, 0);
      expect(result).toBe(input);
    });

    it('handles empty object', () => {
      expect(normalizeObjectKeysDeep({})).toEqual({});
    });
  });
});
