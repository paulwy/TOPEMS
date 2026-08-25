import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  apiGet,
  apiPost,
  apiPut,
  apiPatch,
  apiDelete,
  getServiceClient,
  serviceGet,
  servicePost,
  servicePut,
  serviceDelete,
} from '../apiClient';
import { apiClient, handleResponse } from '@/api/client';

// --- Mocks must be set up before importing the module under test ---

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    getClient: vi.fn(),
  },
  downloadBlob: vi.fn(),
  createBaseAxiosClient: vi.fn(),
}));

vi.mock('@/api/request', () => ({
  handleResponse: vi.fn(),
  safeRequest: vi.fn(),
  paginatedRequest: vi.fn(),
  handleRequestError: vi.fn(),
}));

vi.mock('@/lib/reactQuery', () => ({
  queryClient: {},
  QUERY_KEYS: {},
  CACHE_DURATIONS: {},
}));

// Typed mock references
const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);
const mockPut = vi.mocked(apiClient.put);
const mockPatch = vi.mocked(apiClient.patch);
const mockDelete = vi.mocked(apiClient.delete);
const mockGetClient = vi.mocked(apiClient.getClient);
const mockHandleResponse = vi.mocked(handleResponse);

// Per-service client returned by getClient()
const serviceClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetClient.mockReturnValue(serviceClient);
});

// ─── apiGet ──────────────────────────────────────────────────────────────────

describe('lib/apiClient - apiGet', () => {
  it('calls apiClient.get(url, {params}) and returns handleResponse result', async () => {
    const resp = { success: true, code: 0, message: 'ok', data: { id: 1 }, timestamp: 0 };
    mockGet.mockResolvedValue(resp);
    mockHandleResponse.mockReturnValue({ id: 1 });

    const result = await apiGet('/users', { page: 1, size: 10 });

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/users', { params: { page: 1, size: 10 } });
    expect(mockHandleResponse).toHaveBeenCalledWith(resp, undefined);
    expect(result).toEqual({ id: 1 });
  });

  it('passes options to handleResponse', async () => {
    mockGet.mockResolvedValue({ success: true, data: null });
    mockHandleResponse.mockReturnValue(null);

    await apiGet('/health', undefined, { skipErrorHandler: true, skipErrorToast: true });

    expect(mockHandleResponse).toHaveBeenCalledWith(expect.anything(), {
      skipErrorHandler: true,
      skipErrorToast: true,
    });
  });

  it('wraps undefined params as { params: undefined }', async () => {
    mockGet.mockResolvedValue({ success: true, data: [] });
    mockHandleResponse.mockReturnValue([]);

    await apiGet('/users');

    expect(mockGet).toHaveBeenCalledWith('/users', { params: undefined });
  });

  it('propagates errors from apiClient.get without calling handleResponse', async () => {
    mockGet.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(apiGet('/users')).rejects.toThrow('ECONNREFUSED');
    expect(mockHandleResponse).not.toHaveBeenCalled();
  });
});

// ─── apiPost ─────────────────────────────────────────────────────────────────

describe('lib/apiClient - apiPost', () => {
  it('calls apiClient.post(url, data) and returns handleResponse result', async () => {
    const resp = { success: true, code: 0, message: 'created', data: { id: 2 }, timestamp: 0 };
    mockPost.mockResolvedValue(resp);
    mockHandleResponse.mockReturnValue({ id: 2 });

    const result = await apiPost('/users', { name: 'alice', role: 'admin' });

    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith('/users', { name: 'alice', role: 'admin' });
    expect(mockHandleResponse).toHaveBeenCalledWith(resp, undefined);
    expect(result).toEqual({ id: 2 });
  });

  it('passes options through', async () => {
    mockPost.mockResolvedValue({ success: true, data: null });
    mockHandleResponse.mockReturnValue(null);

    await apiPost('/users', { name: 'bob' }, { skipSuccessToast: true });

    expect(mockHandleResponse).toHaveBeenCalledWith(expect.anything(), {
      skipSuccessToast: true,
    });
  });

  it('works with undefined data', async () => {
    mockPost.mockResolvedValue({ success: true, data: 'ok' });
    mockHandleResponse.mockReturnValue('ok');

    await apiPost('/trigger');

    expect(mockPost).toHaveBeenCalledWith('/trigger', undefined);
  });

  it('propagates errors', async () => {
    mockPost.mockRejectedValue(new Error('500'));
    await expect(apiPost('/users', {})).rejects.toThrow('500');
    expect(mockHandleResponse).not.toHaveBeenCalled();
  });
});

// ─── apiPut ──────────────────────────────────────────────────────────────────

describe('lib/apiClient - apiPut', () => {
  it('calls apiClient.put(url, data) and returns unwrapped result', async () => {
    const resp = {
      success: true,
      code: 0,
      message: 'ok',
      data: { id: 1, name: 'updated' },
      timestamp: 0,
    };
    mockPut.mockResolvedValue(resp);
    mockHandleResponse.mockReturnValue({ id: 1, name: 'updated' });

    const result = await apiPut('/users/1', { name: 'updated' });

    expect(mockPut).toHaveBeenCalledWith('/users/1', { name: 'updated' });
    expect(mockHandleResponse).toHaveBeenCalledWith(resp, undefined);
    expect(result).toEqual({ id: 1, name: 'updated' });
  });

  it('passes options', async () => {
    mockPut.mockResolvedValue({ success: true, data: null });
    mockHandleResponse.mockReturnValue(null);

    await apiPut('/users/1', {}, { skipErrorHandler: true });

    expect(mockHandleResponse).toHaveBeenCalledWith(expect.anything(), { skipErrorHandler: true });
  });

  it('propagates client errors', async () => {
    mockPut.mockRejectedValue(new Error('put-fail'));
    await expect(apiPut('/u/1', {})).rejects.toThrow('put-fail');
    expect(mockHandleResponse).not.toHaveBeenCalled();
  });
});

// ─── apiPatch ────────────────────────────────────────────────────────────────

describe('lib/apiClient - apiPatch', () => {
  it('calls apiClient.patch(url, data) and returns unwrapped result', async () => {
    const resp = {
      success: true,
      code: 0,
      message: 'ok',
      data: { id: 1, status: 'active' },
      timestamp: 0,
    };
    mockPatch.mockResolvedValue(resp);
    mockHandleResponse.mockReturnValue({ id: 1, status: 'active' });

    const result = await apiPatch('/users/1', { status: 'active' });

    expect(mockPatch).toHaveBeenCalledWith('/users/1', { status: 'active' });
    expect(mockHandleResponse).toHaveBeenCalledWith(resp, undefined);
    expect(result).toEqual({ id: 1, status: 'active' });
  });

  it('passes options', async () => {
    mockPatch.mockResolvedValue({ success: true, data: null });
    mockHandleResponse.mockReturnValue(null);

    await apiPatch('/users/1', {}, { skipErrorToast: true });

    expect(mockHandleResponse).toHaveBeenCalledWith(expect.anything(), { skipErrorToast: true });
  });

  it('propagates client errors', async () => {
    mockPatch.mockRejectedValue(new Error('patch-fail'));
    await expect(apiPatch('/u/1', {})).rejects.toThrow('patch-fail');
    expect(mockHandleResponse).not.toHaveBeenCalled();
  });
});

// ─── apiDelete ───────────────────────────────────────────────────────────────

describe('lib/apiClient - apiDelete', () => {
  it('calls apiClient.delete(url) with no data arg and returns result', async () => {
    const resp = { success: true, code: 0, message: 'deleted', data: true, timestamp: 0 };
    mockDelete.mockResolvedValue(resp);
    mockHandleResponse.mockReturnValue(true);

    const result = await apiDelete('/users/1');

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith('/users/1');
    expect(mockHandleResponse).toHaveBeenCalledWith(resp, undefined);
    expect(result).toBe(true);
  });

  it('passes options as second arg (no data param)', async () => {
    mockDelete.mockResolvedValue({ success: true, data: null });
    mockHandleResponse.mockReturnValue(null);

    await apiDelete('/users/1', { skipErrorHandler: true });

    expect(mockDelete).toHaveBeenCalledWith('/users/1');
    expect(mockHandleResponse).toHaveBeenCalledWith(expect.anything(), { skipErrorHandler: true });
  });

  it('propagates errors', async () => {
    mockDelete.mockRejectedValue(new Error('403'));
    await expect(apiDelete('/users/1')).rejects.toThrow('403');
    expect(mockHandleResponse).not.toHaveBeenCalled();
  });
});

// ─── getServiceClient ────────────────────────────────────────────────────────

describe('lib/apiClient - getServiceClient', () => {
  it('returns the client for the given service name', () => {
    const client = getServiceClient('iam');
    expect(mockGetClient).toHaveBeenCalledWith('iam');
    expect(client).toBe(serviceClient);
  });

  it('passes through any valid ServiceName', () => {
    getServiceClient('hrm');
    getServiceClient('ai');
    getServiceClient('workflow');
    expect(mockGetClient).toHaveBeenNthCalledWith(1, 'hrm');
    expect(mockGetClient).toHaveBeenNthCalledWith(2, 'ai');
    expect(mockGetClient).toHaveBeenNthCalledWith(3, 'workflow');
  });
});

// ─── serviceGet ──────────────────────────────────────────────────────────────

describe('lib/apiClient - serviceGet', () => {
  it('gets service client, calls client.get(url, {params}), returns handleResponse result', async () => {
    const resp = { success: true, code: 0, message: 'ok', data: [{ id: 1 }], timestamp: 0 };
    serviceClient.get.mockResolvedValue(resp);
    mockHandleResponse.mockReturnValue([{ id: 1 }]);

    const result = await serviceGet('hrm', '/employees', { department: 'eng' });

    expect(mockGetClient).toHaveBeenCalledWith('hrm');
    expect(serviceClient.get).toHaveBeenCalledWith('/employees', { params: { department: 'eng' } });
    expect(mockHandleResponse).toHaveBeenCalledWith(resp, undefined);
    expect(result).toEqual([{ id: 1 }]);
  });

  it('passes options through', async () => {
    serviceClient.get.mockResolvedValue({ success: true, data: null });
    mockHandleResponse.mockReturnValue(null);

    await serviceGet('iam', '/users', undefined, { skipErrorHandler: true });

    expect(mockHandleResponse).toHaveBeenCalledWith(expect.anything(), { skipErrorHandler: true });
  });

  it('works without params', async () => {
    serviceClient.get.mockResolvedValue({ success: true, data: [] });
    mockHandleResponse.mockReturnValue([]);

    await serviceGet('doc', '/files');

    expect(serviceClient.get).toHaveBeenCalledWith('/files', { params: undefined });
  });

  it('propagates client errors', async () => {
    serviceClient.get.mockRejectedValue(new Error('svc-get-fail'));
    await expect(serviceGet('iam', '/users')).rejects.toThrow('svc-get-fail');
    expect(mockHandleResponse).not.toHaveBeenCalled();
  });
});

// ─── servicePost ─────────────────────────────────────────────────────────────

describe('lib/apiClient - servicePost', () => {
  it('gets service client, calls client.post(url, data), returns result', async () => {
    const resp = { success: true, code: 0, message: 'ok', data: { id: 99 }, timestamp: 0 };
    serviceClient.post.mockResolvedValue(resp);
    mockHandleResponse.mockReturnValue({ id: 99 });

    const result = await servicePost('workflow', '/processes', { name: 'approval' });

    expect(mockGetClient).toHaveBeenCalledWith('workflow');
    expect(serviceClient.post).toHaveBeenCalledWith('/processes', { name: 'approval' });
    expect(mockHandleResponse).toHaveBeenCalledWith(resp, undefined);
    expect(result).toEqual({ id: 99 });
  });

  it('passes options', async () => {
    serviceClient.post.mockResolvedValue({ success: true, data: null });
    mockHandleResponse.mockReturnValue(null);

    await servicePost('notification', '/send', {}, { skipSuccessToast: true });

    expect(mockHandleResponse).toHaveBeenCalledWith(expect.anything(), { skipSuccessToast: true });
  });

  it('propagates client errors', async () => {
    serviceClient.post.mockRejectedValue(new Error('svc-post-fail'));
    await expect(servicePost('iam', '/users', {})).rejects.toThrow('svc-post-fail');
    expect(mockHandleResponse).not.toHaveBeenCalled();
  });
});

// ─── servicePut ──────────────────────────────────────────────────────────────

describe('lib/apiClient - servicePut', () => {
  it('gets service client, calls client.put(url, data), returns result', async () => {
    const resp = { success: true, code: 0, message: 'ok', data: { ok: true }, timestamp: 0 };
    serviceClient.put.mockResolvedValue(resp);
    mockHandleResponse.mockReturnValue({ ok: true });

    const result = await servicePut('qms', '/inspections/1', { status: 'passed' });

    expect(mockGetClient).toHaveBeenCalledWith('qms');
    expect(serviceClient.put).toHaveBeenCalledWith('/inspections/1', { status: 'passed' });
    expect(mockHandleResponse).toHaveBeenCalledWith(resp, undefined);
    expect(result).toEqual({ ok: true });
  });

  it('passes options', async () => {
    serviceClient.put.mockResolvedValue({ success: true, data: null });
    mockHandleResponse.mockReturnValue(null);

    await servicePut('qms', '/inspections/1', {}, { skipErrorHandler: true });

    expect(mockHandleResponse).toHaveBeenCalledWith(expect.anything(), { skipErrorHandler: true });
  });

  it('propagates client errors', async () => {
    serviceClient.put.mockRejectedValue(new Error('svc-put-fail'));
    await expect(servicePut('iam', '/users', {})).rejects.toThrow('svc-put-fail');
    expect(mockHandleResponse).not.toHaveBeenCalled();
  });
});

// ─── serviceDelete ───────────────────────────────────────────────────────────

describe('lib/apiClient - serviceDelete', () => {
  it('gets service client, calls client.delete(url), returns result', async () => {
    const resp = { success: true, code: 0, message: 'ok', data: true, timestamp: 0 };
    serviceClient.delete.mockResolvedValue(resp);
    mockHandleResponse.mockReturnValue(true);

    const result = await serviceDelete('doc', '/files/123');

    expect(mockGetClient).toHaveBeenCalledWith('doc');
    expect(serviceClient.delete).toHaveBeenCalledWith('/files/123');
    expect(mockHandleResponse).toHaveBeenCalledWith(resp, undefined);
    expect(result).toBe(true);
  });

  it('passes options', async () => {
    serviceClient.delete.mockResolvedValue({ success: true, data: null });
    mockHandleResponse.mockReturnValue(null);

    await serviceDelete('doc', '/files/123', { skipErrorHandler: true });

    expect(mockHandleResponse).toHaveBeenCalledWith(expect.anything(), { skipErrorHandler: true });
  });

  it('propagates client errors', async () => {
    serviceClient.delete.mockRejectedValue(new Error('svc-del-fail'));
    await expect(serviceDelete('iam', '/users')).rejects.toThrow('svc-del-fail');
    expect(mockHandleResponse).not.toHaveBeenCalled();
  });
});
