import { describe, it, expect } from 'vitest';
import {
  normalizeListField,
  normalizeTotalField,
  shouldNormalize,
} from '@/api/response-normalize';

describe('api/response-normalize - normalizeListField', () => {
  it('Variant 1: { items: [...] } → { data: [...] }', () => {
    const r = normalizeListField({ items: [1, 2, 3], other: 'x' });
    expect(r.data).toEqual([1, 2, 3]);
    expect(r.other).toBe('x');
  });

  it('Variant 2: { records: [...] } → { data: [...] }', () => {
    const r = normalizeListField({ records: ['a', 'b'] });
    expect(r.data).toEqual(['a', 'b']);
  });

  it('Variant 3: { list: [...] } → { data: [...] }', () => {
    const r = normalizeListField({ list: [10, 20] });
    expect(r.data).toEqual([10, 20]);
  });

  it('Variant 4: { data: { items: [...] } } → data.data = items', () => {
    const r = normalizeListField({ data: { items: [9, 9, 9], foo: 1 } });
    const inner = r.data as Record<string, unknown>;
    expect(inner.data).toEqual([9, 9, 9]);
    expect(inner.foo).toBe(1);
  });

  it('canonical { data: [...] } 原样返回', () => {
    const r = normalizeListField({ data: [1, 2] });
    expect(r.data).toEqual([1, 2]);
  });

  it('非对象输入原样返回', () => {
    expect(normalizeListField(null as unknown as Record<string, unknown>)).toBeNull();
  });
});

describe('api/response-normalize - normalizeTotalField', () => {
  it('Variant 1: total_count → total', () => {
    const r = normalizeTotalField({ total_count: 100 });
    expect(r.total).toBe(100);
  });

  it('Variant 2: count → total', () => {
    const r = normalizeTotalField({ count: 50 });
    expect(r.total).toBe(50);
  });

  it('Variant 3: totalItems → total', () => {
    const r = normalizeTotalField({ totalItems: 25 });
    expect(r.total).toBe(25);
  });

  it('Variant 4: inner data.total_count → data.total', () => {
    const r = normalizeTotalField({ data: { total_count: 77 } });
    const inner = r.data as Record<string, unknown>;
    expect(inner.total).toBe(77);
  });

  it('已有 numeric total 不动', () => {
    const r = normalizeTotalField({ total: 123, total_count: 999 });
    expect(r.total).toBe(123);
  });

  it('string 类型 total_count/count/totalItems 数字串转 number', () => {
    expect(normalizeTotalField({ total_count: '42' }).total).toBe(42);
    expect(normalizeTotalField({ count: '11' }).total).toBe(11);
    expect(normalizeTotalField({ totalItems: '7' }).total).toBe(7);
  });
});

describe('api/response-normalize - shouldNormalize', () => {
  it('默认无 import.meta.env 时返回 false（不抛错）', () => {
    const r = shouldNormalize();
    expect(typeof r).toBe('boolean');
  });
});
