import { describe, it, expect } from 'vitest';
import {
  pickPageSize,
  normalizePaginationParams,
  toBackendPagination,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  PAGE_SIZES,
  COMPACT_PAGE_SIZE,
  LARGE_PAGE_SIZE,
} from '@/constants/pagination';

describe('constants/pagination - 常量', () => {
  it('DEFAULT_PAGE 应为 1', () => {
    expect(DEFAULT_PAGE).toBe(1);
  });

  it('DEFAULT_PAGE_SIZE 应为 20', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
  });

  it('PAGE_SIZES 应包含 [10,20,50,100]', () => {
    expect(PAGE_SIZES).toEqual([10, 20, 50, 100]);
  });

  it('COMPACT_PAGE_SIZE 应为 10, LARGE_PAGE_SIZE 应为 50', () => {
    expect(COMPACT_PAGE_SIZE).toBe(10);
    expect(LARGE_PAGE_SIZE).toBe(50);
  });
});

describe('constants/pagination - pickPageSize', () => {
  it('优先取 pageSize（camelCase）', () => {
    expect(pickPageSize({ pageSize: 30, page_size: 10 })).toBe(30);
  });

  it('pageSize 缺失时取 page_size', () => {
    expect(pickPageSize({ page_size: 25 })).toBe(25);
  });

  it('前两者都缺失时取 pagesize', () => {
    expect(pickPageSize({ pagesize: 15 })).toBe(15);
  });

  it('非正数或非数字应跳过并返回 undefined', () => {
    expect(pickPageSize({ pageSize: 0 })).toBeUndefined();
    expect(pickPageSize({ pageSize: -5 })).toBeUndefined();
    expect(pickPageSize({})).toBeUndefined();
  });
});

describe('constants/pagination - normalizePaginationParams', () => {
  it('缺省值填充：page -> DEFAULT_PAGE, pageSize -> DEFAULT_PAGE_SIZE', () => {
    const result = normalizePaginationParams({});
    expect(result.page).toBe(DEFAULT_PAGE);
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(result.page_size).toBe(DEFAULT_PAGE_SIZE);
    expect(result.pagesize).toBe(DEFAULT_PAGE_SIZE);
  });

  it('三种命名应被统一映射', () => {
    const result = normalizePaginationParams({ page: 3, pageSize: 50 });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
    expect(result.page_size).toBe(50);
    expect(result.pagesize).toBe(50);
  });

  it('search 字段保留', () => {
    const result = normalizePaginationParams({ search: 'hello' });
    expect(result.search).toBe('hello');
  });

  it('page 无效时 fallback 到 DEFAULT_PAGE', () => {
    expect(normalizePaginationParams({ page: 0 }).page).toBe(DEFAULT_PAGE);
    expect(normalizePaginationParams({ page: -1 }).page).toBe(DEFAULT_PAGE);
  });
});

describe('constants/pagination - toBackendPagination', () => {
  it('仅保留 page, page_size, search', () => {
    const result = toBackendPagination({ page: 2, pagesize: 40, search: 'x' });
    expect(result).toEqual({ page: 2, page_size: 40, search: 'x' });
    expect((result as Record<string, unknown>).pagesize).toBeUndefined();
    expect((result as Record<string, unknown>).pageSize).toBeUndefined();
  });

  it('无 search 时返回不含 search', () => {
    const result = toBackendPagination({ pageSize: 10 });
    expect((result as Record<string, unknown>).search).toBeUndefined();
    expect(result.page).toBe(DEFAULT_PAGE);
    expect(result.page_size).toBe(10);
  });
});
