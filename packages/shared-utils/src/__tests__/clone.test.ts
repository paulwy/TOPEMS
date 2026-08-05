import { describe, it, expect, beforeEach } from 'vitest';
import { deepClone, clearCloneCache } from '../clone';

describe('clone utilities', () => {
  beforeEach(() => {
    clearCloneCache();
  });

  describe('deepClone', () => {
    it('should clone primitive values', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('hello')).toBe('hello');
      expect(deepClone(true)).toBe(true);
      expect(deepClone(null)).toBe(null);
      expect(deepClone(undefined)).toBe(undefined);
      expect(deepClone(Symbol('test'))).toBeTypeOf('symbol');
    });

    it('should clone plain objects', () => {
      const obj = { a: 1, b: 'two', c: true };
      const cloned = deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
    });

    it('should clone nested objects', () => {
      const obj = { a: { b: { c: 42 } } };
      const cloned = deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned.a).not.toBe(obj.a);
      expect(cloned.a.b).not.toBe(obj.a.b);
    });

    it('should clone arrays', () => {
      const arr = [1, 'two', { three: 3 }];
      const cloned = deepClone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it('should clone nested arrays', () => {
      const arr = [[1, 2], [3, 4], { nested: [5, 6] }];
      const cloned = deepClone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned[0]).not.toBe(arr[0]);
      expect((cloned[2] as any).nested).not.toBe((arr[2] as any).nested);
    });

    it('should clone Date objects', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const cloned = deepClone(date);

      expect(cloned).toBeInstanceOf(Date);
      expect(cloned.getTime()).toBe(date.getTime());
      expect(cloned).not.toBe(date);
    });

    it('should clone RegExp objects', () => {
      const re = /abc+/gi;
      const cloned = deepClone(re);

      expect(cloned).toBeInstanceOf(RegExp);
      expect(cloned.source).toBe(re.source);
      expect(cloned.flags).toBe(re.flags);
      expect(cloned).not.toBe(re);
    });

    it('should handle circular references in objects', () => {
      const obj: any = { name: 'root' };
      obj.self = obj;

      const cloned = deepClone(obj);

      expect(cloned.name).toBe('root');
      expect(cloned.self).toBe(cloned);
      expect(cloned).not.toBe(obj);
    });

    it('should handle circular references in arrays', () => {
      const arr: any[] = [1, 2];
      arr.push(arr);

      const cloned = deepClone(arr);

      expect(cloned[0]).toBe(1);
      expect(cloned[1]).toBe(2);
      expect(cloned[2]).toBe(cloned);
    });

    it('should handle shared references', () => {
      const shared = { value: 42 };
      const obj = { a: shared, b: shared };

      const cloned = deepClone(obj);

      expect(cloned.a).toBe(cloned.b);
      expect(cloned.a).not.toBe(shared);
      expect(cloned.a.value).toBe(42);
    });

    it('should not clone prototype properties', () => {
      class Foo {
        own = 'own';
      }
      (Foo.prototype as any).protoProp = 'proto';
      const obj: any = new Foo();
      obj.extra = 'extra';

      const cloned: any = deepClone(obj);

      expect(cloned.own).toBe('own');
      expect(cloned.extra).toBe('extra');
      expect(cloned.protoProp).toBeUndefined();
    });

    it('should handle complex mixed structure', () => {
      const data = {
        users: [
          { id: 1, name: 'A', tags: ['a', 'b'], joined: new Date('2023-01-01') },
          { id: 2, name: 'B', tags: [], joined: new Date('2023-02-01') },
        ],
        settings: {
          enabled: true,
          rate: /error|warn/i,
        },
      };

      const cloned = deepClone(data);

      expect(cloned).toEqual(data);
      expect(cloned.users[0]).not.toBe(data.users[0]);
      expect(cloned.users[0].tags).not.toBe(data.users[0].tags);
      expect(cloned.users[0].joined).not.toBe(data.users[0].joined);
      expect(cloned.settings.rate).not.toBe(data.settings.rate);
    });
  });

  describe('clearCloneCache', () => {
    it('should allow independent cloning across separate calls', () => {
      const obj1: any = { name: 'obj1' };
      const obj2: any = { name: 'obj2' };

      const cloned1 = deepClone(obj1);
      clearCloneCache();
      const cloned2 = deepClone(obj2);

      expect(cloned1.name).toBe('obj1');
      expect(cloned2.name).toBe('obj2');
    });
  });
});
