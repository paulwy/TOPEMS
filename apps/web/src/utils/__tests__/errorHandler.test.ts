import { describe, it, expect } from 'vitest';
import { classifyError, getUserFriendlyError } from '../errorHandler';

describe('errorHandler', () => {
  describe('classifyError', () => {
    it('should classify null/undefined as unknown', () => {
      const result = classifyError(null);
      expect(result.category).toBe('unknown');
      expect(result.message).toBe('未知错误');
    });

    it('should classify undefined as unknown', () => {
      const result = classifyError(undefined);
      expect(result.category).toBe('unknown');
    });

    it('should classify network errors', () => {
      const error = { code: 'ERR_NETWORK', message: 'Network Error' };
      const result = classifyError(error);
      expect(result.category).toBe('network');
      expect(result.message).toContain('网络连接');
    });

    it('should classify timeout errors', () => {
      const error = { code: 'ECONNABORTED', message: 'timeout' };
      const result = classifyError(error);
      expect(result.category).toBe('network');
      expect(result.message).toContain('超时');
    });

    it('should classify 401 as auth error', () => {
      const error = { response: { status: 401, data: {} } };
      const result = classifyError(error);
      expect(result.category).toBe('auth');
      expect(result.message).toContain('登录');
    });

    it('should classify 403 as permission error', () => {
      const error = { response: { status: 403, data: {} } };
      const result = classifyError(error);
      expect(result.category).toBe('permission');
      expect(result.message).toContain('权限');
    });

    it('should classify 404 as business error', () => {
      const error = { response: { status: 404, data: { message: 'Not found' } } };
      const result = classifyError(error);
      expect(result.category).toBe('business');
      expect(result.message).toBe('Not found');
    });

    it('should classify 422 as business validation error', () => {
      const error = {
        response: {
          status: 422,
          data: { message: 'Validation failed', errors: [{ field: 'name' }] },
        },
      };
      const result = classifyError(error);
      expect(result.category).toBe('business');
      expect(result.message).toBe('Validation failed');
      expect(result.detail).toContain('field');
    });

    it('should classify 500 as server error', () => {
      const error = { response: { status: 500, data: {} } };
      const result = classifyError(error);
      expect(result.category).toBe('server');
      expect(result.message).toContain('服务器');
    });

    it('should classify 502 as server error', () => {
      const error = { response: { status: 502, data: {} } };
      const result = classifyError(error);
      expect(result.category).toBe('server');
      expect(result.message).toContain('不可用');
    });

    it('should classify 503 as server error', () => {
      const error = { response: { status: 503, data: {} } };
      const result = classifyError(error);
      expect(result.category).toBe('server');
    });

    it('should classify unknown status codes', () => {
      const error = { response: { status: 418, data: { message: "I'm a teapot" } } };
      const result = classifyError(error);
      expect(result.category).toBe('unknown');
      expect(result.message).toBe("I'm a teapot");
    });

    it('should classify request without response as network error', () => {
      const error = { request: {} };
      const result = classifyError(error);
      expect(result.category).toBe('network');
      expect(result.message).toContain('服务器未响应');
    });

    it('should classify Error instances', () => {
      const error = new Error('Something went wrong');
      const result = classifyError(error);
      expect(result.category).toBe('unknown');
      expect(result.message).toBe('Something went wrong');
    });

    it('should classify non-object errors', () => {
      const result = classifyError('string error');
      expect(result.category).toBe('unknown');
      expect(result.message).toBe('string error');
    });
  });

  describe('getUserFriendlyError', () => {
    it('should return friendly message for network error', () => {
      const error = { code: 'ERR_NETWORK', message: 'Network Error' };
      const message = getUserFriendlyError(error);
      expect(message).toContain('网络');
    });

    it('should return friendly message for auth error', () => {
      const error = { response: { status: 401, data: {} } };
      const message = getUserFriendlyError(error);
      expect(message).toContain('登录');
    });

    it('should return friendly message for server error', () => {
      const error = { response: { status: 500, data: {} } };
      const message = getUserFriendlyError(error);
      expect(message).toContain('服务器');
    });
  });
});
