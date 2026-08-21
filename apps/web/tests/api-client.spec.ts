/**
 * @done V80 Tier2 coverage
 *
 * apiClient (apps/web/src/api/client.ts) 单测
 * @see @/api/client
 *
 * 关注点：
 *   - createBaseAxiosClient 工厂：baseURL / withCsrf=false / returnData=false
 *   - apiClient 单例：getClient / setAuthToken / clearAuthToken / 顶层 service getter
 *   - createAxiosClient 响应拦截器对响应数据的归一（受 V79_NORMALIZE_RESPONSE 开关控制）
 *
 * 依赖通过 vi.mock 完整隔离，避免触发真实 axios / csrf / telemetry 副作用。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Hoisted mocks (vi.mock 工厂会被提升到顶部，里面的引用必须用 vi.hoisted) ─
const mocks = vi.hoisted(() => {
  const csrfRequestInterceptor = vi.fn((cfg: any) => cfg);
  const csrfResponseInterceptor = vi.fn();
  const initCsrfProtection = vi.fn();
  const injectTraceContext = vi.fn(() => ({ traceparent: '00-abc-def-01' }));
  const getCurrentTraceId = vi.fn(() => 'trace-id-mock');
  const getCurrentSpanId = vi.fn(() => 'span-id-mock');
  const startTrace = vi.fn(() => ({ traceId: 'trace-id-mock', spanId: 'span-id-mock' }));

  const apiLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  const createLogger = vi.fn(() => apiLogger);

  const shouldNormalize = vi.fn(() => false);
  const normalizeListField = vi.fn((resp: any) => resp);
  const normalizeTotalField = vi.fn((resp: any) => resp);

  const axiosInstances: any[] = [];
  const axiosCreate = vi.fn((config: any) => {
    const instance: any = {
      __config: config,
      interceptors: {
        request: { use: vi.fn(), eject: vi.fn() },
        response: { use: vi.fn(), eject: vi.fn() },
      },
      defaults: { headers: { common: {} } },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };
    axiosInstances.push(instance);
    return instance;
  });

  return {
    csrfRequestInterceptor,
    csrfResponseInterceptor,
    initCsrfProtection,
    injectTraceContext,
    getCurrentTraceId,
    getCurrentSpanId,
    startTrace,
    apiLogger,
    createLogger,
    shouldNormalize,
    normalizeListField,
    normalizeTotalField,
    axiosInstances,
    axiosCreate,
  };
});

vi.mock('@/utils/logger', () => ({
  createLogger: mocks.createLogger,
  apiLogger: mocks.apiLogger,
}));

vi.mock('@/components/security', () => ({
  csrfRequestInterceptor: mocks.csrfRequestInterceptor,
  csrfResponseInterceptor: mocks.csrfResponseInterceptor,
  initCsrfProtection: mocks.initCsrfProtection,
}));

vi.mock('@/utils/telemetry', () => ({
  injectTraceContext: mocks.injectTraceContext,
}));

vi.mock('@/utils/tracing', () => ({
  getCurrentTraceId: mocks.getCurrentTraceId,
  getCurrentSpanId: mocks.getCurrentSpanId,
  startTrace: mocks.startTrace,
}));

vi.mock('@/api/response-normalize', () => ({
  normalizeListField: mocks.normalizeListField,
  normalizeTotalField: mocks.normalizeTotalField,
  shouldNormalize: mocks.shouldNormalize,
}));

vi.mock('@/utils/normalizePageParams', () => ({
  normalizePageParams: vi.fn((p: any) => p),
  normalizeObjectKeysDeep: vi.fn((o: any) => o),
}));

vi.mock('axios', () => {
  const fn: any = vi.fn();
  fn.create = mocks.axiosCreate;
  // 同时 default & 命名空间导出
  return { default: fn };
});

vi.mock('@/config/runtime', () => ({
  default: {
    api: { timeout: 5000 },
    services: {
      iam: '/api/iam-mock',
      core: '/api/core-mock',
      workflow: '/api/workflow-mock',
      file: '/api/file-mock',
      master: '/api/master-mock',
      migration: '/api/migration-mock',
      mail: '/api/mail-mock',
      im: '/api/im-mock',
      notification: '/api/notification-mock',
      search: '/api/search-mock',
      erp: '/api/erp-mock',
      finance: '/api/finance-mock',
      doc: '/api/doc-mock',
      ai: '/api/ai-mock',
      hrm: '/api/hrm-mock',
      pm: '/api/pm-mock',
      crm: '/api/crm-mock',
      mes: '/api/mes-mock',
      pdm: '/api/pdm-mock',
      scm: '/api/scm-mock',
      wms: '/api/wms-mock',
      srm: '/api/srm-mock',
      qms: '/api/qms-mock',
      lims: '/api/lims-mock',
      ehs: '/api/ehs-mock',
      rd: '/api/rd-mock',
      bi: '/api/bi-mock',
      monitor: '/api/monitor-mock',
      portal: '/api/portal-mock',
      mobile: '/api/mobile-mock',
      gis: '/api/gis-mock',
      integration: '/api/integration-mock',
      jaeger: '',
    },
  },
  isProduction: vi.fn(() => false),
  isDevelopment: vi.fn(() => true),
}));

vi.mock('@topems/tokens', () => ({
  API_TIMEOUT: { AI: 60000 },
}));

vi.mock('@topems/shared-types', () => ({}));

// ─── Imports (放在 mocks 之后) ──────────────────────────────────────────
import { createAxiosClient, createBaseAxiosClient, apiClient } from '@/api/client';

const envRef = (import.meta as any).env as Record<string, unknown>;

beforeEach(() => {
  mocks.axiosInstances.length = 0;
  mocks.axiosCreate.mockClear();
  mocks.csrfRequestInterceptor.mockClear();
  mocks.csrfResponseInterceptor.mockClear();
  mocks.initCsrfProtection.mockClear();
  mocks.injectTraceContext.mockClear();
  mocks.getCurrentTraceId.mockClear();
  mocks.getCurrentSpanId.mockClear();
  mocks.startTrace.mockClear();
  mocks.shouldNormalize.mockReset();
  mocks.shouldNormalize.mockReturnValue(false);
  mocks.normalizeListField.mockReset();
  mocks.normalizeListField.mockImplementation((resp: any) => resp);
  mocks.normalizeTotalField.mockReset();
  mocks.normalizeTotalField.mockImplementation((resp: any) => resp);
  mocks.apiLogger.info.mockClear();
  mocks.apiLogger.warn.mockClear();
  mocks.apiLogger.error.mockClear();
  mocks.apiLogger.debug.mockClear();
  mocks.createLogger.mockClear();
  localStorage.clear();
  delete envRef['V79_NORMALIZE_RESPONSE'];
});

afterEach(() => {
  delete envRef['V79_NORMALIZE_RESPONSE'];
});

describe('createBaseAxiosClient', () => {
  it('should call axios.create with the given baseURL and default timeout', () => {
    createBaseAxiosClient('/api/test-base');
    expect(mocks.axiosCreate).toHaveBeenCalled();
    const lastCallConfig = mocks.axiosCreate.mock.calls[mocks.axiosCreate.mock.calls.length - 1][0];
    expect(lastCallConfig.baseURL).toBe('/api/test-base');
    expect(lastCallConfig.timeout).toBe(5000);
  });

  it('should install request and response interceptors', () => {
    const instance = createBaseAxiosClient('/api/test-base') as any;
    expect(instance.interceptors.request.use).toHaveBeenCalled();
    expect(instance.interceptors.response.use).toHaveBeenCalled();
  });
});

describe('createAxiosClient — response interceptor normalize switch', () => {
  it('should NOT call normalize helpers when shouldNormalize() returns false', () => {
    mocks.shouldNormalize.mockReturnValue(false);
    const instance: any = createAxiosClient({ baseURL: '/api/test' });

    // 取出 response success handler（interceptors.response.use 的第一个回调）
    const successHandler = instance.interceptors.response.use.mock.calls[0][0];
    const result = successHandler({
      config: { url: '/x', baseURL: '/api/test' },
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { items: [1, 2, 3] },
    });

    expect(mocks.normalizeListField).not.toHaveBeenCalled();
    expect(mocks.normalizeTotalField).not.toHaveBeenCalled();
    // returnData=true（默认），应返回 response.data
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it('should NOT call normalize helpers even when shouldNormalize() returns true (normalization removed from interceptor)', () => {
    mocks.shouldNormalize.mockReturnValue(true);
    mocks.normalizeListField.mockImplementation((resp: any) => ({ ...resp, data: resp.items }));
    mocks.normalizeTotalField.mockImplementation((resp: any) => ({ ...resp, total: 99 }));

    const instance: any = createAxiosClient({ baseURL: '/api/test' });
    const successHandler = instance.interceptors.response.use.mock.calls[0][0];

    const result = successHandler({
      config: { url: '/y', baseURL: '/api/test' },
      status: 200,
      statusText: 'OK',
      headers: {},
      data: { items: [{ id: 1 }], total_count: 99 },
    });

    // The response interceptor no longer calls normalize helpers directly;
    // normalization (if needed) is handled elsewhere in the pipeline.
    expect(mocks.normalizeListField).not.toHaveBeenCalled();
    expect(mocks.normalizeTotalField).not.toHaveBeenCalled();
    // returnData=true (default), should return response.data unchanged
    expect(result).toEqual({ items: [{ id: 1 }], total_count: 99 });
  });
});

describe('createAxiosClient — request interceptor (CSRF + trace headers)', () => {
  it('should call csrfRequestInterceptor and inject trace headers', () => {
    const instance: any = createAxiosClient({ baseURL: '/api/test' });
    const requestHandler = instance.interceptors.request.use.mock.calls[0][0];

    const result = requestHandler({
      url: '/some',
      method: 'get',
      headers: {},
      baseURL: '/api/test',
      params: undefined,
      data: undefined,
    });

    expect(mocks.csrfRequestInterceptor).toHaveBeenCalled();
    // 注入 trace headers
    expect(result.headers['x-trace-id']).toBe('trace-id-mock');
    expect(result.headers['x-span-id']).toBe('span-id-mock');
    expect(result.headers['x-request-id']).toBe('trace-id-mock');
  });

  it('should attach Authorization Bearer header when token exists in localStorage and not a public path', () => {
    localStorage.setItem('token', 'bearer-token-abc');
    const instance: any = createAxiosClient({ baseURL: '/api/test' });
    const requestHandler = instance.interceptors.request.use.mock.calls[0][0];

    const result = requestHandler({
      url: '/users',
      method: 'get',
      headers: {},
      baseURL: '/api/test',
      params: undefined,
      data: undefined,
    });

    expect(result.headers['Authorization']).toBe('Bearer bearer-token-abc');
  });

  it('should NOT attach Authorization for public paths (e.g. /auth/login)', () => {
    localStorage.setItem('token', 'bearer-token-abc');
    const instance: any = createAxiosClient({ baseURL: '/api/test' });
    const requestHandler = instance.interceptors.request.use.mock.calls[0][0];

    const result = requestHandler({
      url: '/auth/login',
      method: 'post',
      headers: {},
      baseURL: '/api/test',
      params: undefined,
      data: undefined,
    });

    expect(result.headers['Authorization']).toBeUndefined();
  });
});

describe('apiClient singleton', () => {
  it('should expose getClients() returning a non-empty map of service clients', () => {
    const clients = apiClient.getClients();
    expect(typeof clients).toBe('object');
    expect(Object.keys(clients).length).toBeGreaterThanOrEqual(10);
    // 关键服务都应存在
    for (const expected of ['iam', 'core', 'doc', 'ai', 'workflow']) {
      expect(clients[expected], `client "${expected}" must exist`).toBeDefined();
    }
  });

  it('should setAuthorization header across all clients via setAuthToken()', () => {
    apiClient.setAuthToken('test-token-xyz');
    const clients = apiClient.getClients();
    for (const client of Object.values(clients)) {
      expect((client as any).defaults.headers.common['Authorization']).toBe(
        'Bearer test-token-xyz'
      );
    }
  });

  it('should remove Authorization header from all clients via clearAuthToken()', () => {
    apiClient.setAuthToken('temp-token');
    apiClient.clearAuthToken();
    const clients = apiClient.getClients();
    for (const client of Object.values(clients)) {
      expect((client as any).defaults.headers.common['Authorization']).toBeUndefined();
    }
  });

  it('should expose iam getter returning the iam client', () => {
    expect((apiClient.iam as any).__config.baseURL).toBe('/api/iam-mock');
  });

  it('should expose core getter returning the core client', () => {
    expect((apiClient.core as any).__config.baseURL).toBe('/api/core-mock');
  });

  it('should expose all documented service getters (doc/ai/workflow/rd/qms/lims/...)', () => {
    // 这些 getter 都是 this.clients.X 的直通，逐一覆盖以提升 client.ts 覆盖率
    const expected: Array<[keyof typeof apiClient, string]> = [
      ['doc', '/api/doc-mock'],
      ['ai', '/api/ai-mock'],
      ['workflow', '/api/workflow-mock'],
      ['flow', '/api/workflow-mock'],
      ['rd', '/api/rd-mock'],
      ['lims', '/api/lims-mock'],
      ['qms', '/api/qms-mock'],
      ['ehs', '/api/ehs-mock'],
      ['srm', '/api/srm-mock'],
      ['pdm', '/api/pdm-mock'],
      ['bi', '/api/bi-mock'],
      ['gis', '/api/gis-mock'],
      ['mobile', '/api/mobile-mock'],
      ['im', '/api/im-mock'],
      ['erp', '/api/erp-mock'],
      ['integration', '/api/integration-mock'],
      ['wms', '/api/wms-mock'],
      ['hrm', '/api/hrm-mock'],
      ['crm', '/api/crm-mock'],
      ['mes', '/api/mes-mock'],
      ['pm', '/api/pm-mock'],
      ['file', '/api/file-mock'],
      ['scm', '/api/scm-mock'],
      ['finance', '/api/finance-mock'],
      ['notification', '/api/notification-mock'],
      ['mail', '/api/mail-mock'],
      ['migration', '/api/migration-mock'],
      ['monitor', '/api/monitor-mock'],
      ['master', '/api/master-mock'],
      ['portal', '/api/portal-mock'],
      ['search', '/api/search-mock'],
    ];
    for (const [getter, expectedBaseURL] of expected) {
      const client = (apiClient as any)[getter];
      expect(client, `getter "${String(getter)}" must return a client`).toBeDefined();
      expect(client.__config.baseURL).toBe(expectedBaseURL);
    }
  });

  it('should provide get/post/put/patch/delete helpers delegating to core', async () => {
    const coreClient = apiClient.core as any;
    coreClient.get.mockResolvedValue({ data: 'get-resp' });
    coreClient.post.mockResolvedValue({ data: 'post-resp' });
    coreClient.put.mockResolvedValue({ data: 'put-resp' });
    coreClient.patch.mockResolvedValue({ data: 'patch-resp' });
    coreClient.delete.mockResolvedValue({ data: 'delete-resp' });

    // apiClient.get 内部只是 return this.clients.core.get<T>(url, config)，
    // 不会自动 unwrap .data —— 真实运行时由 axios 响应拦截器负责。
    await expect(apiClient.get('/users')).resolves.toEqual({ data: 'get-resp' });
    await expect(apiClient.post('/users', { a: 1 })).resolves.toEqual({ data: 'post-resp' });
    await expect(apiClient.put('/users/1', { a: 2 })).resolves.toEqual({ data: 'put-resp' });
    await expect(apiClient.patch('/users/1', { a: 3 })).resolves.toEqual({ data: 'patch-resp' });
    await expect(apiClient.delete('/users/1')).resolves.toEqual({ data: 'delete-resp' });

    expect(coreClient.get).toHaveBeenCalledWith('/users', undefined);
    expect(coreClient.post).toHaveBeenCalledWith('/users', { a: 1 }, undefined);
  });
});
