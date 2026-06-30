import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (class name merger)', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'active', false && 'hidden')).toBe('base active');
  });

  it('should handle undefined and null', () => {
    expect(cn('base', undefined, null)).toBe('base');
  });

  it('should merge arrays of class names', () => {
    expect(cn(['a', 'b'], 'c')).toBe('a b c');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
  });

  it('should not deduplicate class names (clsx behavior)', () => {
    // clsx does not deduplicate - it just joins them
    expect(cn('foo', 'foo')).toBe('foo foo');
  });
});
