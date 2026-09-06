/** HTTP 传输层：鉴权 + 请求封装 + NDJSON 流式消费（V0.1） */

import type { Paged, PageParams } from './types.js';

/** 可注入的 transport 实现（默认真实 fetch；测试可替换为 mock）。 */
export interface FetchLike {
  (input: string, init?: RequestInit): Promise<Response>;
}

export interface HttpTransportOptions {
  baseUrl: string;
  authToken?: string;
  fetchImpl?: FetchLike;
  /** 默认请求超时（毫秒），默认 30s。 */
  timeoutMs?: number;
}

function buildQuery(params?: PageParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.page_size !== undefined) search.set('page_size', String(params.page_size));
  if (params.keyword) search.set('search', params.keyword);
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/** 业务工具 HTTP 传输客户端（只依赖标准 fetch）。 */
export class HttpTransport {
  readonly baseUrl: string;
  private authToken?: string;
  private fetchImpl: FetchLike;
  private timeoutMs: number;

  constructor(options: HttpTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.authToken = options.authToken;
    this.fetchImpl = options.fetchImpl ?? ((...args) => fetch(...args));
    this.timeoutMs = options.timeoutMs ?? 30_000;
  }

  setAuthToken(token: string | undefined): void {
    this.authToken = token;
  }

  private headers(extra?: Record<string, string>): HeadersInit {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extra,
    };
    if (this.authToken) {
      h.Authorization = `Bearer ${this.authToken}`;
    }
    return h;
  }

  private async raw(path: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: { ...this.headers(), ...(init?.headers ?? {}) },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  /** JSON 请求：非 2xx 抛错，2xx 反序列化为 T。 */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.raw(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`BusinessTools API ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  /** 分页 GET：透传 page/page_size/search。 */
  async pagedGet<T>(path: string, params?: PageParams): Promise<Paged<T>> {
    return this.request<Paged<T>>('GET', `${path}${buildQuery(params)}`);
  }

  /**
   * NDJSON 流式消费：每行 JSON 回调一次；服务端关闭后 resolve。
   * 用于 exportTask.stream / auditLogs.stream 场景。
   */
  async streamNdjson<T>(
    path: string,
    onItem: (item: T) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const res = await this.raw(path, {
      method: 'GET',
      headers: { Accept: 'application/x-ndjson' },
      signal,
    });
    if (!res.ok || !res.body) {
      throw new Error(`BusinessTools stream request failed: ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (line) onItem(JSON.parse(line) as T);
      }
    }
  }
}

/** 便捷：构造 SDK 用的鉴权头（供外部集成参考）。 */
export function bearerAuth(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
