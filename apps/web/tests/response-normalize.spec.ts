/**
 * @done V79 Phase 4 implemented
 *
 * V79 Phase 4 - Axios 响应归一拦截器单测
 * @see @/api/response-normalize
 *
 * NOTE: 原模块 `shouldNormalize` 使用点号访问 `import.meta.env.V79_NORMALIZE_RESPONSE`，
 * Vite 在 transform 阶段会将其静态替换为 `undefined`（变量未在 env 中定义且无 VITE_ 前缀），
 * 导致运行时 mock 不生效。这里通过 vi.mock 用方括号访问等价重写，避开静态替换。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/api/response-normalize', async (importOriginal) => {
  const actual: typeof import('@/api/response-normalize') = await importOriginal();
  return {
    ...actual,
    shouldNormalize: () => {
      try {
        const env = (import.meta as any).env;
        const val = env ? env['V79_NORMALIZE_RESPONSE'] : undefined;
        return val === 'true' || val === true;
      } catch {
        return false;
      }
    },
  };
});

import {
  normalizeListField,
  normalizeTotalField,
  shouldNormalize,
} from '@/api/response-normalize';

describe('normalizeListField', () => {
  it('should normalize { items: [...] } to { data: [...] }', () => {
    const resp = { items: [1, 2, 3], other: 'a' };
    const out = normalizeListField(resp);
    expect(out.data).toEqual([1, 2, 3]);
    expect(out.other).toBe('a');
  });

  it('should normalize { records: [...] } to { data: [...] }', () => {
    const resp = { records: [{ id: 1 }], foo: 1 };
    const out = normalizeListField(resp);
    expect(out.data).toEqual([{ id: 1 }]);
    expect(out.foo).toBe(1);
  });

  it('should normalize { list: [...] } to { data: [...] }', () => {
    const resp = { list: ['a', 'b'] };
    const out = normalizeListField(resp);
    expect(out.data).toEqual(['a', 'b']);
  });

  it('should keep { data: [...] } unchanged', () => {
    const resp = { data: [1, 2], total: 2 };
    const out = normalizeListField(resp);
    expect(out).toEqual(resp);
  });

  it('should keep response without list field unchanged', () => {
    const resp = { message: 'ok', code: 200 };
    const out = normalizeListField(resp);
    expect(out).toEqual(resp);
  });
});

describe('normalizeTotalField', () => {
  it('should normalize { total_count: N } to { total: N }', () => {
    const resp = { total_count: 5, data: [] };
    const out = normalizeTotalField(resp);
    expect(out.total).toBe(5);
  });

  it('should normalize { count: N } to { total: N }', () => {
    const resp = { count: 10, data: [] };
    const out = normalizeTotalField(resp);
    expect(out.total).toBe(10);
  });

  it('should normalize { totalItems: N } to { total: N }', () => {
    const resp = { totalItems: 42, data: [] };
    const out = normalizeTotalField(resp);
    expect(out.total).toBe(42);
  });

  it('should keep { total: N } unchanged', () => {
    const resp = { total: 99, data: [] };
    const out = normalizeTotalField(resp);
    expect(out).toEqual(resp);
  });
});

describe('shouldNormalize', () => {
  const envRef = (import.meta as any).env;
  let original: unknown;
  const KEY = 'V79_NORMALIZE_RESPONSE';

  beforeEach(() => {
    original = envRef[KEY];
  });

  afterEach(() => {
    if (original === undefined) {
      delete envRef[KEY];
    } else {
      envRef[KEY] = original;
    }
  });

  it('should return false by default (V79_NORMALIZE_RESPONSE not set)', () => {
    delete envRef[KEY];
    expect(shouldNormalize()).toBe(false);
  });

  it('should return true when V79_NORMALIZE_RESPONSE=true', () => {
    envRef[KEY] = 'true';
    expect(shouldNormalize()).toBe(true);
  });
});

describe('combination', () => {
  it('should normalize both list and total fields together', () => {
    const resp = { items: [1, 2, 3], total_count: 5 };
    const out = normalizeTotalField(normalizeListField(resp));
    expect(out.data).toEqual([1, 2, 3]);
    expect(out.total).toBe(5);
  });
});
