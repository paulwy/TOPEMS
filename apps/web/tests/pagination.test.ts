import { describe, it, expect } from 'vitest';
import {
  pickPageSize,
  normalizePaginationParams,
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
} from '@/constants/pagination';

describe('constants/pagination - 常量', () => {
  it('DEFAULT_PAGE 应为 1', () => {
    expect(DEFAULT_PAGE).toBe(1);
  });

  it('DEFAULT_PAGE_SIZE 应为 20', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(20);
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
