import { describe, it, expect, beforeEach } from 'vitest';
import { t, initTranslate } from '../i18n';

describe('shared-utils/i18n', () => {
  beforeEach(() => {
    // Reset to default translate function (returns key as-is)
    initTranslate((key) => key);
  });

  describe('default behavior', () => {
    it('returns key as-is when no translate function is initialized', () => {
      expect(t('hello.world')).toBe('hello.world');
    });

    it('returns key as-is for any string', () => {
      expect(t('password.length.too_short')).toBe('password.length.too_short');
    });
  });

  describe('initTranslate', () => {
    it('replaces the translate function', () => {
      initTranslate((key) => {
        if (key === 'greeting') return 'Hello, World!';
        return key;
      });
      expect(t('greeting')).toBe('Hello, World!');
      expect(t('other.key')).toBe('other.key');
    });

    it('can be called multiple times to update translate function', () => {
      initTranslate(() => 'first');
      expect(t('any.key')).toBe('first');

      initTranslate(() => 'second');
      expect(t('any.key')).toBe('second');
    });
  });

  describe('parameter substitution (fallback)', () => {
    it('substitutes {param} when translate returns key unchanged', () => {
      initTranslate((key) => key); // default: returns key
      expect(t('Hello, {name}', { name: 'John' })).toBe('Hello, John');
    });

    it('substitutes multiple params', () => {
      initTranslate((key) => key);
      expect(t('{greeting}, {name}!', { greeting: 'Hi', name: 'Alice' })).toBe(
        'Hi, Alice!'
      );
    });

    it('substitutes numeric params', () => {
      initTranslate((key) => key);
      expect(t('You have {count} messages', { count: 5 })).toBe(
        'You have 5 messages'
      );
    });

    it('substitutes repeated params', () => {
      initTranslate((key) => key);
      expect(t('{x} + {x} = 2{x}', { x: 3 })).toBe('3 + 3 = 23');
    });

    it('does NOT substitute when translate function returns a different string', () => {
      initTranslate((key) => {
        if (key === 'Hello, {name}') return 'Translated greeting';
        return key;
      });
      expect(t('Hello, {name}', { name: 'John' })).toBe('Translated greeting');
    });

    it('does NOT attempt substitution when no params provided', () => {
      initTranslate((key) => key);
      expect(t('some.key.without.params')).toBe('some.key.without.params');
    });

    it('handles params with no matching placeholder gracefully', () => {
      initTranslate((key) => key);
      expect(t('no placeholders here', { unused: 'value' })).toBe(
        'no placeholders here'
      );
    });
  });
});
