import { describe, it, expect, vi } from 'vitest';

import { tpl } from '../i18n';

// Mock @/i18n with an identity translator (returns the key itself).
// i18n.ts imports the singleton from '../i18n' which resolves to src/i18n —
// the same module aliased as '@/i18n', so this mock applies.
vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

describe('utils/i18n tpl', () => {
  it('returns the key unchanged when no vars are provided', () => {
    expect(tpl('shared.common.save')).toBe('shared.common.save');
  });

  it('returns the key unchanged when vars is an empty object', () => {
    expect(tpl('shared.common.cancel', {})).toBe('shared.common.cancel');
  });

  it('replaces a single {{variable}} placeholder', () => {
    expect(tpl('Hello, {{name}}!', { name: 'Alice' })).toBe('Hello, Alice!');
  });

  it('replaces multiple distinct variables in one string', () => {
    expect(tpl('{{greet}}, {{name}}!', { greet: 'Hi', name: 'Bob' })).toBe('Hi, Bob!');
  });

  it('replaces every occurrence of the same variable', () => {
    expect(tpl('{{x}}-{{x}}-{{x}}', { x: 'ab' })).toBe('ab-ab-ab');
  });

  it('stringifies non-string variable values (number, boolean, object)', () => {
    expect(tpl('Count: {{count}}', { count: 42 })).toBe('Count: 42');
    expect(tpl('Flag: {{flag}}', { flag: true })).toBe('Flag: true');
  });

  it('leaves unknown placeholders untouched when vars lack the key', () => {
    // Only provides "name", but template has "missing" too
    expect(tpl('{{name}} and {{missing}}', { name: 'Alice' })).toBe('Alice and {{missing}}');
  });

  it('handles variable value 0 and does not skip replacement', () => {
    expect(tpl('value={{n}}', { n: 0 })).toBe('value=0');
  });
});
