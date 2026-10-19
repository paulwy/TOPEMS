import { describe, it, expect, vi } from 'vitest';
import { fnv1aHash } from '../bff/abTesting';

vi.mock('@/utils/logger', () => ({
  logger: { child: () => ({}) },
}));
vi.mock('@/i18n', () => ({ default: {} }));

describe('fnv1aHash (FNV-1a 32-bit)', () => {
  it('空串返回 FNV offset basis 0x811c9dc5', () => {
    expect(fnv1aHash('')).toBe(0x811c9dc5);
    expect(fnv1aHash('')).toBe(2166136261);
  });

  it('同一输入两次调用结果一致（稳定分流）', () => {
    expect(fnv1aHash('user-42:exp-1')).toBe(fnv1aHash('user-42:exp-1'));
  });

  it('不同输入产生不同哈希', () => {
    expect(fnv1aHash('user-1')).not.toBe(fnv1aHash('user-2'));
  });

  it('结果始终落在无符号 32 位区间 [0, 2^32)', () => {
    for (const s of ['a', 'abc', 'user-42:exp-1', '中文测试', '']) {
      const h = fnv1aHash(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(2 ** 32);
    }
  });

  it('大小写敏感（不做归一化）', () => {
    expect(fnv1aHash('Ab')).not.toBe(fnv1aHash('ab'));
  });
});
