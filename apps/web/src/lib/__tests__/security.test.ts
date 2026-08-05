import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sanitizeHtml,
  escapeHtml,
  validateUrl,
  validateEmail,
  generateCsrfToken,
  setCsrfToken,
  getCsrfToken,
  verifyCsrfToken,
  initCsrfToken,
  sanitizeInput,
} from '@/lib/security';
import {
  csrfRequestInterceptor,
  csrfResponseInterceptor,
  initCsrfProtection,
  validateCsrfToken,
  getCsrfHeaderName,
} from '@/lib/csrf';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';

const CSRF_TOKEN_KEY = 'csrf_token';
const CSRF_TOKEN_EXPIRE_KEY = 'csrf_token_expire';
const CSRF_COOKIE_NAME = 'csrf_token';

describe('lib/security', () => {
  let originalGetRandomValues: typeof crypto.getRandomValues;

  beforeEach(() => {
    localStorage.clear();
    // Clear cookies
    document.cookie.split(';').forEach((c) => {
      const eqPos = c.indexOf('=');
      const name = eqPos > -1 ? c.slice(0, eqPos).trim() : c.trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });

    // Stub crypto.getRandomValues for deterministic tests
    originalGetRandomValues = crypto.getRandomValues;
    let counter = 0;
    crypto.getRandomValues = vi.fn((arr: Uint32Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = 0x11111111 + counter++;
      }
      return arr;
    }) as typeof crypto.getRandomValues;
  });

  afterEach(() => {
    crypto.getRandomValues = originalGetRandomValues;
    localStorage.clear();
  });

  describe('escapeHtml', () => {
    it('returns empty string for null/undefined/empty', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null as any)).toBe('');
      expect(escapeHtml(undefined as any)).toBe('');
    });

    it('escapes HTML special characters using DOM textContent', () => {
      const result = escapeHtml('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result.toLowerCase()).toContain('&lt;');
      // textContent->innerHTML does not always escape quotes since text nodes always convert &/<> only
      expect(result.toLowerCase()).toContain('&lt;script&gt;');
    });

    it('returns plain text unchanged', () => {
      expect(escapeHtml('Hello world!')).toBe('Hello world!');
    });
  });

  describe('sanitizeHtml', () => {
    it('returns empty string for null/undefined/empty', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as any)).toBe('');
    });

    it('removes malicious script tags while preserving content', () => {
      const input = '<p>Hello</p><script>alert("XSS")</script>';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).toContain('<p>Hello</p>');
      expect(sanitized.toLowerCase()).not.toContain('<script>');
    });

    it('strips inline event handlers', () => {
      const input = '<img src="x.jpg" onerror="alert(1)">';
      const sanitized = sanitizeHtml(input);
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).toContain('<img');
    });

    it('allows iframe with configured attributes', () => {
      const input =
        '<iframe src="https://www.youtube.com/embed/abc" allow="fullscreen" allowfullscreen frameborder="0" scrolling="no"></iframe>';
      const sanitized = sanitizeHtml(input);
      expect(sanitized.toLowerCase()).toContain('<iframe');
      expect(sanitized).toContain('allowfullscreen');
      expect(sanitized).toContain('frameborder');
    });
  });

  describe('validateUrl', () => {
    it('returns false for empty/null/undefined', () => {
      expect(validateUrl('')).toBe(false);
      expect(validateUrl(null as any)).toBe(false);
      expect(validateUrl(undefined as any)).toBe(false);
    });

    it('accepts http and https URLs', () => {
      expect(validateUrl('http://example.com')).toBe(true);
      expect(validateUrl('https://example.com/path?q=1#hash')).toBe(true);
    });

    it('rejects other protocols (javascript, ftp, file)', () => {
      expect(validateUrl('javascript:alert(1)')).toBe(false);
      expect(validateUrl('ftp://files.example.com')).toBe(false);
      expect(validateUrl('file:///etc/passwd')).toBe(false);
    });

    it('rejects malformed strings', () => {
      expect(validateUrl('not a url')).toBe(false);
      expect(validateUrl('www.example.com')).toBe(false); // missing protocol
    });
  });

  describe('validateEmail', () => {
    it('returns false for empty/null/undefined', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null as any)).toBe(false);
    });

    it('accepts valid email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('first.last+tag@sub-domain.example.co.uk')).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(validateEmail('missing-at-sign.com')).toBe(false);
      expect(validateEmail('no.tld@domain')).toBe(false);
      expect(validateEmail('spaces here@example.com')).toBe(false);
      expect(validateEmail('@@example.com')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('returns empty string for empty/null', () => {
      expect(sanitizeInput('')).toBe('');
      expect(sanitizeInput(null as any)).toBe('');
    });

    it('removes script blocks explicitly', () => {
      const result = sanitizeInput('before <script type="text/javascript">alert(1)</script> after');
      expect(result.toLowerCase()).not.toContain('<script');
      expect(result).toContain('before');
      expect(result).toContain('after');
    });

    it('escapes remaining HTML entities via escapeHtml', () => {
      const result = sanitizeInput('<div class="x">text</div>');
      expect(result).not.toContain('<div');
      expect(result.toLowerCase()).toContain('&lt;');
    });
  });

  describe('CSRF token lifecycle', () => {
    it('generateCsrfToken produces deterministic 64-char hex string via mocked random', () => {
      const token = generateCsrfToken();
      // Each uint32 becomes 8 hex chars, 8 values = 64 chars
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      // Deterministic because counter increments predictably
      expect(generateCsrfToken()).not.toBe(token);
    });

    it('setCsrfToken stores token and 24h expiry in localStorage', () => {
      const before = Date.now();
      vi.useFakeTimers();
      vi.setSystemTime(before);

      setCsrfToken('abc-token');
      expect(localStorage.getItem(CSRF_TOKEN_KEY)).toBe('abc-token');
      const expire = parseInt(localStorage.getItem(CSRF_TOKEN_EXPIRE_KEY) || '0', 10);
      expect(expire).toBe(before + 24 * 60 * 60 * 1000);

      vi.useRealTimers();
    });

    it('getCsrfToken returns stored token if within TTL', () => {
      setCsrfToken('fresh-token');
      expect(getCsrfToken()).toBe('fresh-token');
    });

    it('getCsrfToken clears and returns null when expired', () => {
      localStorage.setItem(CSRF_TOKEN_KEY, 'stale');
      localStorage.setItem(
        CSRF_TOKEN_EXPIRE_KEY,
        (Date.now() - 48 * 60 * 60 * 1000).toString() // 48h in past = expired
      );
      expect(getCsrfToken()).toBeNull();
      expect(localStorage.getItem(CSRF_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(CSRF_TOKEN_EXPIRE_KEY)).toBeNull();
    });

    it('getCsrfToken returns null when key missing', () => {
      expect(getCsrfToken()).toBeNull();
    });

    it('verifyCsrfToken compares provided token against stored one', () => {
      setCsrfToken('match-token');
      expect(verifyCsrfToken('match-token')).toBe(true);
      expect(verifyCsrfToken('wrong-token')).toBe(false);
    });

    it('initCsrfToken reuses existing non-expired token', () => {
      localStorage.setItem(CSRF_TOKEN_KEY, 'existing');
      localStorage.setItem(CSRF_TOKEN_EXPIRE_KEY, (Date.now() + 12 * 60 * 60 * 1000).toString());
      const token = initCsrfToken();
      expect(token).toBe('existing');
    });

    it('initCsrfToken generates and stores new token when missing', () => {
      const token = initCsrfToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
      expect(localStorage.getItem(CSRF_TOKEN_KEY)).toBe(token);
      expect(parseInt(localStorage.getItem(CSRF_TOKEN_EXPIRE_KEY) || '0', 10)).toBeGreaterThan(
        Date.now()
      );
    });
  });
});

describe('lib/csrf (axios interceptors)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie.split(';').forEach((c) => {
      const eqPos = c.indexOf('=');
      const name = eqPos > -1 ? c.slice(0, eqPos).trim() : c.trim();
      if (name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
  });

  describe('csrfRequestInterceptor', () => {
    it('injects X-CSRF-Token header when token exists', () => {
      localStorage.setItem(CSRF_TOKEN_KEY, 'req-token');
      localStorage.setItem(CSRF_TOKEN_EXPIRE_KEY, (Date.now() + 3600_000).toString());

      const config: AxiosRequestConfig = { url: '/test', method: 'post' };
      const result = csrfRequestInterceptor(config);
      expect((result.headers as Record<string, string>)?.['X-CSRF-Token']).toBe('req-token');
    });

    it('preserves existing headers and adds the CSRF header', () => {
      setCsrfToken('tkn');
      const config: AxiosRequestConfig = {
        url: '/x',
        headers: { Authorization: 'Bearer abc', 'Content-Type': 'application/json' },
      };
      const result = csrfRequestInterceptor(config);
      expect((result.headers as any)['Authorization']).toBe('Bearer abc');
      expect((result.headers as any)['Content-Type']).toBe('application/json');
      expect((result.headers as any)['X-CSRF-Token']).toBe('tkn');
    });

    it('does not add header when no token stored', () => {
      const config: AxiosRequestConfig = { url: '/test' };
      const result = csrfRequestInterceptor(config);
      expect(result.headers).toBeUndefined();
    });
  });

  describe('csrfResponseInterceptor', () => {
    it('writes token from response header to cookie', () => {
      const response = {
        headers: { 'x-csrf-token': 'resp-token-123' },
      } as AxiosResponse;
      const result = csrfResponseInterceptor(response);
      expect(result).toBe(response);
      expect(document.cookie).toContain(`${CSRF_COOKIE_NAME}=resp-token-123`);
    });

    it('ignores missing or non-string CSRF response header', () => {
      const before = document.cookie;
      csrfResponseInterceptor({ headers: {} } as AxiosResponse);
      csrfResponseInterceptor({ headers: { 'x-csrf-token': 42 } } as any);
      expect(document.cookie).toBe(before); // should not add invalid cookies
    });

    it('lowercases header lookup for response', () => {
      // Real axios normalizes response headers to lowercase keys
      const response = {
        headers: { 'x-csrf-token': 'MixedCase' },
      } as AxiosResponse;
      csrfResponseInterceptor(response);
      expect(document.cookie).toContain(`${CSRF_COOKIE_NAME}=MixedCase`);
    });
  });

  describe('helpers', () => {
    it('initCsrfProtection calls initCsrfToken', () => {
      expect(localStorage.getItem(CSRF_TOKEN_KEY)).toBeNull();
      initCsrfProtection();
      expect(localStorage.getItem(CSRF_TOKEN_KEY)).toBeTruthy();
    });

    it('validateCsrfToken returns false for undefined', () => {
      expect(validateCsrfToken(undefined)).toBe(false);
    });

    it('validateCsrfToken delegates to verifyCsrfToken', () => {
      setCsrfToken('good');
      expect(validateCsrfToken('good')).toBe(true);
      expect(validateCsrfToken('bad')).toBe(false);
    });

    it('getCsrfHeaderName returns X-CSRF-Token', () => {
      expect(getCsrfHeaderName()).toBe('X-CSRF-Token');
    });
  });
});
