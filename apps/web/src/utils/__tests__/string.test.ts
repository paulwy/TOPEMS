import { describe, it, expect } from 'vitest';
import {
  trim,
  trimAll,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  capitalize,
  uncapitalize,
  repeat,
  truncate,
  isEmpty,
  isNotEmpty,
  slugify,
  stripHtml,
  escapeHtml,
  unescapeHtml,
  snakeToTitle,
  camelToTitle,
  maskPhone,
  maskEmail,
  maskIdCard,
  limitLength,
} from '@/utils/string';

describe('trim', () => {
  it('should trim leading and trailing spaces', () => {
    expect(trim('  hello  ')).toBe('hello');
  });

  it('should return unchanged string without surrounding spaces', () => {
    expect(trim('hello')).toBe('hello');
  });

  it('should handle empty string', () => {
    expect(trim('')).toBe('');
  });
});

describe('trimAll', () => {
  it('should remove all spaces', () => {
    expect(trimAll('hello world')).toBe('helloworld');
  });

  it('should handle multiple spaces', () => {
    expect(trimAll('  a  b  c  ')).toBe('abc');
  });
});

describe('toCamelCase', () => {
  it('should convert snake_case to camelCase', () => {
    expect(toCamelCase('hello_world')).toBe('helloWorld');
  });

  it('should convert kebab-case to camelCase', () => {
    expect(toCamelCase('hello-world')).toBe('helloWorld');
  });

  it('should handle string with spaces', () => {
    expect(toCamelCase('hello world')).toBe('helloWorld');
  });

  it('should handle already camelCase string', () => {
    expect(toCamelCase('helloWorld')).toBe('helloWorld');
  });

  it('should handle empty string', () => {
    expect(toCamelCase('')).toBe('');
  });
});

describe('toSnakeCase', () => {
  it('should convert camelCase to snake_case', () => {
    expect(toSnakeCase('helloWorld')).toBe('hello_world');
  });

  it('should handle already snake_case', () => {
    expect(toSnakeCase('hello_world')).toBe('hello_world');
  });

  it('should handle empty string', () => {
    expect(toSnakeCase('')).toBe('');
  });
});

describe('toKebabCase', () => {
  it('should convert camelCase to kebab-case', () => {
    expect(toKebabCase('helloWorld')).toBe('hello-world');
  });

  it('should handle already kebab-case', () => {
    expect(toKebabCase('hello-world')).toBe('hello-world');
  });

  it('should handle empty string', () => {
    expect(toKebabCase('')).toBe('');
  });
});

describe('capitalize', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('should handle already capitalized', () => {
    expect(capitalize('Hello')).toBe('Hello');
  });

  it('should handle empty string', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('uncapitalize', () => {
  it('should lowercase first letter', () => {
    expect(uncapitalize('Hello')).toBe('hello');
  });

  it('should handle already uncapitalized', () => {
    expect(uncapitalize('hello')).toBe('hello');
  });
});

describe('repeat', () => {
  it('should repeat string', () => {
    expect(repeat('ab', 3)).toBe('ababab');
  });

  it('should return empty string for 0 times', () => {
    expect(repeat('ab', 0)).toBe('');
  });
});

describe('truncate', () => {
  it('should not truncate short strings', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('should truncate long strings with default suffix', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('should truncate with custom suffix', () => {
    // maxLength=8, suffix='...more'(7 chars) -> 8-7=1 char kept -> 'h' + '...more' = 'h...more'
    expect(truncate('hello world', 8, '...more')).toBe('h...more');
  });
});

describe('isEmpty', () => {
  it('should return true for null', () => {
    expect(isEmpty(null)).toBe(true);
  });

  it('should return true for undefined', () => {
    expect(isEmpty(undefined)).toBe(true);
  });

  it('should return true for empty string', () => {
    expect(isEmpty('')).toBe(true);
  });

  it('should return true for whitespace-only string', () => {
    expect(isEmpty('   ')).toBe(true);
  });

  it('should return false for non-empty string', () => {
    expect(isEmpty('hello')).toBe(false);
  });
});

describe('isNotEmpty', () => {
  it('should return true for non-empty string', () => {
    expect(isNotEmpty('hello')).toBe(true);
  });

  it('should return false for null', () => {
    expect(isNotEmpty(null)).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(isNotEmpty('')).toBe(false);
  });
});

describe('slugify', () => {
  it('should convert to URL-friendly string', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
  });

  it('should handle already slugified input', () => {
    expect(slugify('hello-world')).toBe('hello-world');
  });

  it('should handle empty string', () => {
    expect(slugify('')).toBe('');
  });
});

describe('stripHtml', () => {
  it('should remove HTML tags', () => {
    expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
  });

  it('should handle string without tags', () => {
    expect(stripHtml('Hello World')).toBe('Hello World');
  });

  it('should handle empty string', () => {
    expect(stripHtml('')).toBe('');
  });
});

describe('escapeHtml', () => {
  it('should escape HTML special characters', () => {
    const input = '<div class="test">&hello\'</div>';
    expect(escapeHtml(input)).toBe('&lt;div class=&quot;test&quot;&gt;&amp;hello&#39;&lt;/div&gt;');
  });

  it('should return unchanged string without special chars', () => {
    expect(escapeHtml('hello')).toBe('hello');
  });
});

describe('unescapeHtml', () => {
  it('should unescape HTML entities', () => {
    expect(unescapeHtml('&lt;div&gt;')).toBe('<div>');
  });

  it('should handle ampersand entity', () => {
    expect(unescapeHtml('&amp;')).toBe('&');
  });
});

describe('snakeToTitle', () => {
  it('should convert snake_case to Title Case', () => {
    expect(snakeToTitle('hello_world')).toBe('Hello World');
  });

  it('should handle single word', () => {
    expect(snakeToTitle('hello')).toBe('Hello');
  });
});

describe('camelToTitle', () => {
  it('should convert camelCase to Title Case', () => {
    expect(camelToTitle('helloWorld')).toBe('Hello World');
  });

  it('should handle single word', () => {
    expect(camelToTitle('hello')).toBe('Hello');
  });
});

describe('maskPhone', () => {
  it('should mask middle 4 digits', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
  });
});

describe('maskEmail', () => {
  it('should mask email', () => {
    expect(maskEmail('testuser@example.com')).toBe('te***@example.com');
  });
});

describe('maskIdCard', () => {
  it('should mask id card', () => {
    expect(maskIdCard('110101199001011234')).toBe('1101**********1234');
  });
});

describe('limitLength', () => {
  it('should not limit short strings', () => {
    expect(limitLength('hello', 10)).toBe('hello');
  });

  it('should limit long strings', () => {
    expect(limitLength('hello world', 5)).toBe('hello...');
  });

  it('should support custom suffix', () => {
    expect(limitLength('hello world', 8, '..')).toBe('hello wo..');
  });
});
