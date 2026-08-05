import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ApiResponse } from '@topems/shared-types';
import { handleResponse, handleRequestError, safeRequest, paginatedRequest } from '../request';

vi.mock('@/utils/logger', () => ({
  default: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
  __esModule: true,
}));

vi.mock('@/utils/errors', () => ({
  handleApiError: vi.fn((e: unknown) => ({
    code: 'HANDLED',
    message: e instanceof Error ? e.message : String(e),
    details: e,
  })),
  AppExceptionError: class AppExceptionError extends Error {},
  __esModule: true,
}));

const makeResponse = <T>(overrides: Partial<ApiResponse<T>> = {}): ApiResponse<T> => ({
  success: true,
  code: 0,
  message: 'OK',
  data: null as T,
  timestamp: Date.now(),
  ...overrides,
});

describe('api/request handleResponse', () => {
  it('returns data for successful responses', () => {
    const resp = makeResponse({ success: true, data: { id: 42, name: 'topems' } });
    const result = handleResponse(resp);
    expect(result).toEqual({ id: 42, name: 'topems' });
  });

  it('throws AppError with code/message/details for failure responses', () => {
    const resp = makeResponse({
      success: false,
      code: 40401,
      message: 'Not Found',
      data: { entity: 'user' } as unknown as string,
    });
    expect(() => handleResponse(resp)).toThrowError(
      expect.objectContaining({
        code: 40401,
        message: 'Not Found',
        details: { entity: 'user' },
      })
    );
  });

  it('still throws even when skipErrorHandler=true (just skips logging)', () => {
    const resp = makeResponse({ success: false, code: 500, message: 'boom' });
    expect(() => handleResponse(resp, { skipErrorHandler: true })).toThrowError(
      expect.objectContaining({ code: 500, message: 'boom' })
    );
  });

  it('throws when skipErrorHandler=false but skipErrorToast=true', () => {
    // Inner skip skips inner throw, outer unconditional throw still runs
    const resp = makeResponse({ success: false, code: 403, message: 'Forbidden' });
    expect(() => handleResponse(resp, { skipErrorToast: true })).toThrowError(
      expect.objectContaining({ code: 403 })
    );
  });

  it('handles null data in success', () => {
    const resp = makeResponse({ data: undefined as unknown as null });
    expect(handleResponse(resp)).toBeUndefined();
  });
});

describe('api/request handleRequestError', () => {
  it('passes error through handleApiError and returns appError shape', () => {
    const out = handleRequestError(new Error('network down'));
    expect(out).toEqual({
      code: 'HANDLED',
      message: 'network down',
      details: expect.any(Error),
    });
  });
});

describe('api/request safeRequest', () => {
  it('returns data via handleResponse on success', async () => {
    const fn = vi.fn(async () => makeResponse({ data: { ok: true } }));
    const out = await safeRequest(fn);
    expect(out).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('rethrows appError when skipErrorHandler=false (default)', async () => {
    const fn = vi.fn(async () => makeResponse({ success: false, code: 1001, message: 'fail' }));
    await expect(safeRequest(fn)).rejects.toMatchObject({ code: 'HANDLED' });
    // handleApiError wraps the original throw from handleResponse, so outer error should have HANDLED code
  });

  it('returns null instead of throwing when skipErrorHandler=true', async () => {
    const fn = vi.fn(async () => {
      throw new Error('network ECONNREFUSED');
    });
    const out = await safeRequest(fn, { skipErrorHandler: true });
    expect(out).toBeNull();
  });

  it('calls requestFn exactly once even on failure', async () => {
    const fn = vi.fn(async () => {
      throw new Error('oops');
    });
    try {
      await safeRequest(fn);
    } catch {
      /* ignore */
    }
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('api/request paginatedRequest', () => {
  const makePage = <T>(
    items: T[],
    total: number,
    page: number,
    pagesize: number
  ): ApiResponse<{ items: T[]; total: number; page: number; pagesize: number }> =>
    makeResponse({
      data: { items, total, page, pagesize },
    });

  it('returns {items,total,page,pagesize} on success', async () => {
    const fn = vi.fn(async () => makePage([{ id: 1 }, { id: 2 }, { id: 3 }], 100, 1, 10));
    const result = await paginatedRequest<{ id: number }>(fn, { page: 1, pagesize: 10 });
    expect(result).toEqual({
      items: [{ id: 1 }, { id: 2 }, { id: 3 }],
      total: 100,
      page: 1,
      pagesize: 10,
    });
    expect(fn).toHaveBeenCalledWith({ page: 1, pagesize: 10 });
  });

  it('throws error with code and message when response.success=false', async () => {
    const fn = vi.fn(async () =>
      makeResponse({
        success: false,
        code: 50001,
        message: 'DB Timeout',
        data: null as unknown as { items: never[]; total: number; page: number; pagesize: number },
      })
    );
    await expect(paginatedRequest(fn)).rejects.toThrowError('DB Timeout');
    await expect(paginatedRequest(fn)).rejects.toMatchObject({ code: 50001 });
  });

  it('passes extra params through to requestFn', async () => {
    const fn = vi.fn(async () => makePage([], 0, 2, 20));
    await paginatedRequest(fn, { page: 2, pagesize: 20, search: 'abc', sortBy: 'name' });
    expect(fn).toHaveBeenCalledWith({
      page: 2,
      pagesize: 20,
      search: 'abc',
      sortBy: 'name',
    });
  });

  it('defaults params to {} when not provided', async () => {
    const fn = vi.fn(async () => makePage([], 0, 1, 20));
    await paginatedRequest(fn);
    expect(fn).toHaveBeenCalledWith({});
  });
});
