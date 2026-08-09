import { describe, it, expect } from 'vitest';
import { parseQueryName } from '@/utils/graphql-performance';

describe('utils/graphql-performance - parseQueryName', () => {
  it('带 operation 类型 + 名称：`query UserInfo { ... }`', () => {
    expect(parseQueryName('query UserInfo { id name }')).toBe('UserInfo');
  });

  it('mutation 操作', () => {
    expect(parseQueryName('mutation CreateUser { createUser { id } }')).toBe('CreateUser');
  });

  it('subscription 操作', () => {
    expect(parseQueryName('subscription Watch { updated }')).toBe('Watch');
  });

  it('匿名 shorthand `{ ... }` 取首个字段名', () => {
    expect(parseQueryName('{ me { id } }')).toBe('me');
  });

  it('前后空白不影响', () => {
    expect(parseQueryName('   query  GetOrders   { items }   ')).toBe('GetOrders');
  });

  it('完全不匹配时返回 "Unknown"', () => {
    expect(parseQueryName('')).toBe('Unknown');
    expect(parseQueryName('not a query at all')).toBe('Unknown');
  });
});
