/**
 * @done V79 Phase 4 implemented
 *
 * Canonical Storage 单测
 * @see @/utils/storage
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalStorage, SessionStorage } from '@/utils/storage';

describe('CanonicalLocalStorage / CanonicalSessionStorage', () => {
  let storage: LocalStorage;

  beforeEach(() => {
    storage = new LocalStorage();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should set and get a string value with topems_ prefix', () => {
    storage.set('test-key', 'hello');
    expect(storage.get('test-key')).toBe('hello');
    expect(localStorage.getItem('topems_test-key')).not.toBeNull();
  });

  it('should return defaultValue when key does not exist', () => {
    expect(storage.get('missing', 'default')).toBe('default');
    expect(storage.get<string>('missing')).toBeUndefined();
  });

  it('should has() return true/false for existing/non-existing keys', () => {
    storage.set('exists', 'val');
    expect(storage.has('exists')).toBe(true);
    expect(storage.has('nope')).toBe(false);
  });

  it('should remove() delete a single key', () => {
    storage.set('a', 1);
    storage.set('b', 2);
    storage.remove('a');
    expect(storage.has('a')).toBe(false);
    expect(storage.get('b')).toBe(2);
  });

  it('should clear() wipe only topems_ prefixed keys', () => {
    storage.set('foo', 'bar');
    localStorage.setItem('non-prefixed', 'val');
    storage.clear();
    expect(localStorage.getItem('topems_foo')).toBeNull();
    expect(localStorage.getItem('non-prefixed')).toBe('val');
  });

  it('should set() with TTL -> get() return undefined after expire', () => {
    vi.useFakeTimers();
    storage.set('temp', 'val', 1000);
    expect(storage.get('temp')).toBe('val');
    vi.advanceTimersByTime(2000);
    expect(storage.get('temp')).toBeUndefined();
  });

  it('should keys() list only topems_ prefixed keys', () => {
    storage.set('k1', 1);
    storage.set('k2', 2);
    storage.set('k3', 3);
    localStorage.setItem('non-prefixed', 'x');
    const keys = storage.keys();
    expect(keys).toHaveLength(3);
    expect(keys).toEqual(expect.arrayContaining(['k1', 'k2', 'k3']));
    keys.forEach((k) => expect(k.startsWith('topems_')).toBe(false));
  });

  it('should length() return topems_ keys count', () => {
    // storage.ts 没有暴露 length() 方法，使用 keys().length 等效验证
    storage.set('k1', 1);
    storage.set('k2', 2);
    expect(storage.keys().length).toBe(2);
  });

  it('should SessionStorage equivalent behave same (isolated)', () => {
    const session = new SessionStorage();
    session.set('s-key', 's-val');
    expect(session.get('s-key')).toBe('s-val');
    // 底层 sessionStorage 应有带前缀的键
    expect(sessionStorage.getItem('topems_s-key')).not.toBeNull();
    // 与 localStorage 隔离
    expect(localStorage.getItem('topems_s-key')).toBeNull();
    session.remove('s-key');
    expect(session.get('s-key')).toBeUndefined();
  });

  it('should JSON object roundtrip via set/get', () => {
    storage.set('obj', { name: 'test', count: 42, nested: { a: true } });
    const result = storage.get('obj');
    expect(result).toEqual({ name: 'test', count: 42, nested: { a: true } });
  });

  it('should getWithMigrate read legacy non-prefixed key and upgrade to canonical format', () => {
    localStorage.setItem('legacy-key', JSON.stringify('legacy-value'));
    const value = storage.getWithMigrate('legacy-key', 'fallback');
    expect(value).toBe('legacy-value');
    // 升级后应写入 topems_legacy-key
    expect(localStorage.getItem('topems_legacy-key')).not.toBeNull();
  });

  it('should getWithMigrate return fallback when neither canonical nor legacy key exists', () => {
    expect(storage.getWithMigrate('nonexistent', 'fb')).toBe('fb');
  });
});
