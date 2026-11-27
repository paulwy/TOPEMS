/**
 * FE-17-3 后续防回归测试：BFF GraphQL 请求层（bffGraphQL / executeGraphQL）
 *
 * 验证点：
 * 1. 请求统一走 apiClient.portal.post('/graphql')，不再使用裸 fetch 手动拼接 headers
 * 2. APQ 协议：hash-only 请求返回 PersistedQueryNotFound 时回退完整 query + hash
 * 3. GraphQL errors（HTTP 200 + { errors }）按原协议抛出
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/api/client';
import { bffGraphQL } from '@/api/bff';
import { EDGE_TOLERANT_TIMEOUT_MS } from '@/config/edgeTimeout';

// mock 依赖：仅保留 bffGraphQL 用到的能力
vi.mock('@/api/client', () => ({
  apiClient: {
    portal: { post: vi.fn() },
  },
}));

vi.mock('@/utils/graphqlPerformance', () => ({
  performanceMark: vi.fn(),
  performanceMeasure: vi.fn(() => 1),
  parseQueryName: (query: string): string => {
    const m = query.match(/^\w+\s+(\w+)/);
    return m ? m[1] : 'unknown';
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { child: () => ({ warn: vi.fn(), debug: vi.fn(), error: vi.fn(), info: vi.fn() }) },
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

// 关闭 dev mock 短路，走真实请求分支
vi.stubEnv('VITE_BFF_MOCK', 'false');

const portalPost = vi.mocked(apiClient.portal.post);

beforeEach(() => {
  portalPost.mockReset();
  // 固定 SHA-256 字节序列（仅需稳定 hex，内容无关）
  const digest = async (): Promise<ArrayBuffer> => {
    const buf = new Uint8Array(32);
    for (let i = 0; i < 32; i += 1) buf[i] = i;
    return buf.buffer as ArrayBuffer;
  };
  vi.stubGlobal('crypto', { subtle: { digest } });
});

describe('bffGraphQL（FE-17-3 后续收口）', () => {
  it('成功路径：走 apiClient.portal.post("/graphql")，不带手动 headers 配置', async () => {
    const data = { dashboard: { stats: [] } };
    portalPost.mockResolvedValue({ data });

    await expect(bffGraphQL('query Dashboard { dashboard { stats } }')).resolves.toEqual(data);

    expect(portalPost).toHaveBeenCalledTimes(1);
    const [url, body, config] = portalPost.mock.calls[0];
    expect(url).toBe('/graphql');
    // 请求体含 APQ 扩展（hash-only 首发）
    expect(body).toEqual({
      query: '',
      variables: undefined,
      extensions: { persistedQuery: { version: 1, sha256Hash: expect.any(String) } },
    });
    // 无手动 headers：由统一 axios 拦截器注入 token / x-tenant-id / trace / CSRF
    // 只允许放宽超时（CF 隧道链路抖动，见 config/edgeTimeout.ts）
    expect(config).toEqual({ timeout: EDGE_TOLERANT_TIMEOUT_MS });
    expect((config as { headers?: unknown } | undefined)?.headers).toBeUndefined();
  });

  it('APQ 回退：PersistedQueryNotFound 时二次发送完整 query + hash', async () => {
    portalPost
      .mockResolvedValueOnce({ errors: [{ message: 'PersistedQueryNotFound' }] })
      .mockResolvedValueOnce({ data: { completeTodo: true } });

    await expect(
      bffGraphQL('mutation CompleteTodo($id: String!) { completeTodo(id: $id) }', { id: 't-1' })
    ).resolves.toEqual({ completeTodo: true });

    expect(portalPost).toHaveBeenCalledTimes(2);
    // 第二次为完整 query + 变量 + APQ hash
    const [, fallbackBody] = portalPost.mock.calls[1];
    expect(fallbackBody).toEqual({
      query: 'mutation CompleteTodo($id: String!) { completeTodo(id: $id) }',
      variables: { id: 't-1' },
      extensions: { persistedQuery: { version: 1, sha256Hash: expect.any(String) } },
    });
  });

  it('GraphQL errors：HTTP 200 + { errors } 按原协议抛出（message 含 errors 序列化）', async () => {
    portalPost.mockResolvedValue({ errors: [{ message: 'boom' }], data: null });

    await expect(bffGraphQL('query Dashboard { dashboard }')).rejects.toThrow(
      'GraphQL errors: [{"message":"boom"}]'
    );
  });
});
