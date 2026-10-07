import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AxiosRequestConfig, AxiosAdapter } from 'axios';
import { serializeParams, createApiClient } from '../factory';

describe('serializeParams', () => {
  describe('默认关闭（snakeCaseParams=false，回滚安全）', () => {
    it('原样透传 camelCase 键名（pageSize 不变）', () => {
      const out = serializeParams({ pageSize: 20, pageNum: 2, keyword: 'abc' });
      expect(out).toBe('pageSize=20&pageNum=2&keyword=abc');
    });

    it('number/boolean 转字符串，null/undefined 跳过', () => {
      const out = serializeParams({ a: 1, b: true, c: null, d: undefined, e: 'x' });
      expect(out).toBe('a=1&b=true&e=x');
    });

    it('不传 options 与显式传 false 行为一致', () => {
      expect(serializeParams({ pageSize: 10 })).toBe('pageSize=10');
      expect(serializeParams({ pageSize: 10 }, { snakeCaseParams: false })).toBe('pageSize=10');
    });
  });

  describe('开启 snakeCaseParams=true', () => {
    it('camelCase → snake_case（pageSize→page_size）', () => {
      const out = serializeParams({ pageSize: 20, pageNum: 2, keyword: 'abc' }, { snakeCaseParams: true });
      expect(out).toBe('page_size=20&page_num=2&keyword=abc');
    });

    it('多个大写字母逐个转下划线', () => {
      const out = serializeParams({ warehouseId: 'W1', stockKeepingUnit: 'SKU1' }, { snakeCaseParams: true });
      expect(out).toBe('warehouse_id=W1&stock_keeping_unit=SKU1');
    });

    it('值不转换（值里的大小写保持原样）', () => {
      const out = serializeParams({ sortBy: 'createdAt', status: 'ActiveX' }, { snakeCaseParams: true });
      expect(out).toBe('sort_by=createdAt&status=ActiveX');
    });

    it('嵌套对象/数组的键名递归转换，值保留', () => {
      const out = serializeParams(
        { pageSize: 10, filter: { warehouseId: 'W1', ownerName: 'Bob' }, tags: ['aB', 'cD'] },
        { snakeCaseParams: true },
      );
      // 顶层键转换；嵌套对象键也转换（序列化为 JSON 串）
      expect(out).toContain('page_size=10');
      expect(out).toContain(encodeURIComponent('"warehouse_id":"W1"'));
      expect(out).toContain(encodeURIComponent('"owner_name":"Bob"'));
    });

    it('snake_case 键不被二次转换（幂等）', () => {
      const out = serializeParams({ page_size: 20, created_at: '2026-01-01' }, { snakeCaseParams: true });
      expect(out).toBe('page_size=20&created_at=2026-01-01');
    });

    it('boolean/number 值仍正确序列化', () => {
      const out = serializeParams({ pageSize: 15, ascending: true }, { snakeCaseParams: true });
      expect(out).toBe('page_size=15&ascending=true');
    });
  });
});

describe('createApiClient', () => {
  // 用自定义 adapter 避免真实网络；reject 时把真实 config 挂到 error 上（与 axios 行为一致）
  const useMockAdapter = (
    client: ReturnType<typeof createApiClient>,
    handler: (config: AxiosRequestConfig) => unknown,
  ) => {
    client.defaults.adapter = (async (config) => handler(config)) as unknown as AxiosAdapter;
  };
  const httpError = (status: number, config: AxiosRequestConfig) => {
    const err = new Error(`Request failed with status ${status}`) as Error & {
      config: AxiosRequestConfig;
      response: { status: number; data: unknown };
      isAxiosError: boolean;
    };
    err.config = config;
    err.response = { status, data: {} };
    err.isAxiosError = true;
    return err;
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('默认 unwrapData=false：返回完整 AxiosResponse（现状）', async () => {
    const client = createApiClient({ baseURL: 'http://x' });
    useMockAdapter(client, () => ({
      data: { code: 0, message: 'ok', data: { id: 1 } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as AxiosRequestConfig,
    }));
    const res = await client.get('/whatever');
    expect((res as { data: unknown }).data).toEqual({ code: 0, message: 'ok', data: { id: 1 } });
  });

  it('unwrapData=true：响应拦截器直接返回 data', async () => {
    const client = createApiClient({ baseURL: 'http://x', unwrapData: true });
    useMockAdapter(client, () => ({
      data: { code: 0, message: 'ok', data: { id: 42 } },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as AxiosRequestConfig,
    }));
    const res = await client.get('/whatever');
    expect(res).toEqual({ code: 0, message: 'ok', data: { id: 42 } });
  });

  it('401 触发 onUnauthorized 回调（默认无回调=仅 reject）', async () => {
    const onUnauthorized = vi.fn();
    const client = createApiClient({ baseURL: 'http://x', onUnauthorized });
    useMockAdapter(client, (config) => {
      throw httpError(401, config);
    });
    await expect(client.get('/protected')).rejects.toBeTruthy();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('snakeCaseParams=true 时实例 paramsSerializer 用转换后的键名', () => {
    const client = createApiClient({ baseURL: 'http://x', snakeCaseParams: true });
    const ser = client.defaults.paramsSerializer as { serialize?: (p: unknown) => string };
    expect(ser).toBeTruthy();
    expect(ser!.serialize!({ pageSize: 20, warehouseId: 'W1' })).toBe('page_size=20&warehouse_id=W1');
  });

  it('snakeCaseParams 缺省时实例 paramsSerializer 原样透传', () => {
    const client = createApiClient({ baseURL: 'http://x' });
    const ser = client.defaults.paramsSerializer as { serialize?: (p: unknown) => string };
    expect(ser!.serialize!({ pageSize: 20 })).toBe('pageSize=20');
  });

  it('getToken 注入 Authorization 头', async () => {
    let captured: Record<string, unknown> = {};
    const client = createApiClient({ baseURL: 'http://x', getToken: () => 'tok-abc' });
    useMockAdapter(client, (config) => {
      captured = config.headers as Record<string, unknown>;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    });
    await client.get('/a');
    expect(captured.Authorization).toBe('Bearer tok-abc');
  });

  it('retry maxRetries 默认 0：500 不重试直接 reject', async () => {
    let calls = 0;
    const client = createApiClient({ baseURL: 'http://x' });
    useMockAdapter(client, (config) => {
      calls += 1;
      throw httpError(500, config);
    });
    await expect(client.get('/flaky')).rejects.toBeTruthy();
    expect(calls).toBe(1);
  });

  it('retry maxRetries>0：命中状态码时按次数重试', async () => {
    let calls = 0;
    const client = createApiClient({
      baseURL: 'http://x',
      retry: { maxRetries: 2, baseDelay: 1 },
    });
    useMockAdapter(client, (config) => {
      calls += 1;
      throw httpError(503, config);
    });
    await expect(client.get('/flaky')).rejects.toBeTruthy();
    expect(calls).toBe(3); // 首次 + 2 次重试
  });
});
