import { describe, it, expect } from 'vitest';

import { API_RETRY_CONFIG, PUBLIC_API_PATTERNS } from '../api';

describe('api constants', () => {
  describe('API_RETRY_CONFIG', () => {
    it('should have correct retry configuration values', () => {
      expect(API_RETRY_CONFIG.MAX_RETRIES).toBe(2);
      expect(API_RETRY_CONFIG.BASE_DELAY).toBe(500);
      expect(API_RETRY_CONFIG.MAX_DELAY).toBe(3000);
      expect(API_RETRY_CONFIG.MAX_TOTAL_WAIT).toBe(10000);
    });

    it('should have BASE_DELAY less than MAX_DELAY', () => {
      expect(API_RETRY_CONFIG.BASE_DELAY).toBeLessThan(API_RETRY_CONFIG.MAX_DELAY);
    });

    it('should have MAX_DELAY less than MAX_TOTAL_WAIT', () => {
      expect(API_RETRY_CONFIG.MAX_DELAY).toBeLessThan(API_RETRY_CONFIG.MAX_TOTAL_WAIT);
    });
  });

  describe('PUBLIC_API_PATTERNS', () => {
    it('should contain health and auth-related public paths', () => {
      expect(PUBLIC_API_PATTERNS).toContain('/health');
      expect(PUBLIC_API_PATTERNS).toContain('/auth/login');
      expect(PUBLIC_API_PATTERNS).toContain('/auth/register');
      expect(PUBLIC_API_PATTERNS).toContain('/auth/refresh');
      expect(PUBLIC_API_PATTERNS).toContain('/auth/forgot-password');
      expect(PUBLIC_API_PATTERNS).toContain('/auth/reset-password');
    });

    it('should be a readonly tuple', () => {
      expect(PUBLIC_API_PATTERNS.length).toBe(6);
    });
  });
});
