import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { createRequest, request } from '../request';

vi.mock('axios', () => {
  const interceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  };

  const create = vi.fn(() => ({
    interceptors,
    defaults: { headers: { common: {}, Authorization: undefined } as unknown as AxiosRequestConfig['headers'] },
  }));

  return { default: { create, interceptors } };
});

// We also import axios here so that vi.mock above works; in actual runtime
// the shared-utils request module will use our mocked axios.create.
import axios from 'axios';
const mockedAxios = axios as unknown as {
  create: ReturnType<typeof vi.fn>;
};

const makeConfig = (
  url: string,
  extra: Partial<InternalAxiosRequestConfig> = {}
): InternalAxiosRequestConfig =>
  ({
    url,
    headers: {} as InternalAxiosRequestConfig['headers'],
    ...extra,
  }) as InternalAxiosRequestConfig;

describe('shared-utils/request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('createRequest factory', () => {
    it('calls axios.create with provided baseURL and timeout', () => {
      createRequest('/api/v2', 30000);
      expect(mockedAxios.create).toHaveBeenCalledTimes(1);
      const call = mockedAxios.create.mock.calls[0][0];
      expect(call.baseURL).toBe('/api/v2');
      expect(call.timeout).toBe(30000);
    });

    it('defaults timeout to 10000 when not provided', () => {
      createRequest('/default');
      const call = mockedAxios.create.mock.calls[0][0];
      expect(call.timeout).toBe(10000);
    });

    it('registers exactly one request and one response interceptor', () => {
      createRequest('/x');
      const instance = mockedAxios.create.mock.results[0].value as unknown as {
        interceptors: { request: { use: ReturnType<typeof vi.fn> }; response: { use: ReturnType<typeof vi.fn> } };
      };
      expect(instance.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(instance.interceptors.response.use).toHaveBeenCalledTimes(1);
    });

    it('default export request is a client (truthy)', () => {
      // Just verify the default export is a valid object (axios instance proxy)
      expect(request).toBeTruthy();
    });
  });

  describe('request interceptor', () => {
    const getRequestInterceptor = () => {
      createRequest('/r');
      const instance = mockedAxios.create.mock.results[0].value as unknown as {
        interceptors: { request: { use: ReturnType<typeof vi.fn> } };
      };
      return instance.interceptors.request.use.mock.calls[0][0] as (
        c: InternalAxiosRequestConfig
      ) => InternalAxiosRequestConfig;
    };

    it('skips token injection for public paths', () => {
      localStorage.setItem('token', 'abc123');
      const interceptor = getRequestInterceptor();
      const cfg = makeConfig('/api/core/iam/auth/login');
      const out = interceptor(cfg);
      expect((out.headers as Record<string, string>)?.Authorization).toBeUndefined();
    });

    it('injects Bearer token for non-public requests when token exists', () => {
      localStorage.setItem('token', 'token-xyz');
      const interceptor = getRequestInterceptor();
      const cfg = makeConfig('/api/users');
      const out = interceptor(cfg);
      expect((out.headers as Record<string, string>)?.Authorization).toBe('Bearer token-xyz');
    });

    it('does not override existing Authorization header', () => {
      localStorage.setItem('token', 'a');
      const interceptor = getRequestInterceptor();
      const cfg = makeConfig('/api/users');
      (cfg.headers as Record<string, string>).Authorization = 'Custom token';
      const out = interceptor(cfg);
      expect((out.headers as Record<string, string>)?.Authorization).toBe('Custom token');
    });

    it('skips token when no token is stored', () => {
      const interceptor = getRequestInterceptor();
      const cfg = makeConfig('/api/users');
      const out = interceptor(cfg);
      expect((out.headers as Record<string, string>)?.Authorization).toBeUndefined();
    });

    it('handles undefined url gracefully', () => {
      localStorage.setItem('token', 't');
      const interceptor = getRequestInterceptor();
      const cfg = makeConfig(undefined as unknown as string);
      cfg.url = undefined as unknown as string;
      const out = interceptor(cfg);
      expect((out.headers as Record<string, string>)?.Authorization).toBe('Bearer t');
    });
  });

  describe('response interceptor', () => {
    const getResponseInterceptor = () => {
      createRequest('/s');
      const instance = mockedAxios.create.mock.results[0].value as unknown as {
        interceptors: { response: { use: ReturnType<typeof vi.fn> } };
      };
      const call = instance.interceptors.response.use.mock.calls[0];
      return {
        onFulfilled: call[0] as (r: AxiosResponse) => unknown,
        onRejected: call[1] as (e: unknown) => Promise<never>,
      };
    };

    it('onFulfilled unwraps response.data', () => {
      const { onFulfilled } = getResponseInterceptor();
      const res = { data: { id: 1, name: 'x' } } as AxiosResponse;
      expect(onFulfilled(res)).toEqual({ id: 1, name: 'x' });
    });

    it('401 on non-auth page clears token/user and dispatches auth:unauthorized event', async () => {
      localStorage.setItem('token', 'old-token');
      localStorage.setItem('user', JSON.stringify({ id: 1 }));
      const listener = vi.fn();
      window.addEventListener('auth:unauthorized', listener);
      // Mock window.location.pathname so test is stable
      Object.defineProperty(window, 'location', {
        value: { pathname: '/dashboard' },
        writable: true,
      });

      const { onRejected } = getResponseInterceptor();
      const err = { response: { status: 401 } };
      await expect(onRejected(err)).rejects.toEqual(err);

      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(listener).toHaveBeenCalledTimes(1);
      window.removeEventListener('auth:unauthorized', listener);
    });

    it('401 on /login page does NOT clear token or dispatch event', async () => {
      localStorage.setItem('token', 'still-valid');
      localStorage.setItem('user', '{}');
      const listener = vi.fn();
      window.addEventListener('auth:unauthorized', listener);
      Object.defineProperty(window, 'location', {
        value: { pathname: '/login' },
        writable: true,
      });

      const { onRejected } = getResponseInterceptor();
      const err = { response: { status: 401 } };
      await expect(onRejected(err)).rejects.toEqual(err);

      expect(localStorage.getItem('token')).toBe('still-valid');
      expect(listener).not.toHaveBeenCalled();
      window.removeEventListener('auth:unauthorized', listener);
    });

    it('non-401 errors simply reject unchanged', async () => {
      const { onRejected } = getResponseInterceptor();
      const err = { response: { status: 500, data: 'boom' } };
      await expect(onRejected(err)).rejects.toEqual(err);
    });
  });
});
