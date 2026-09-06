/** 审计日志子客户端（V0.1）：list/get/stream NDJSON、日期范围、操作人过滤 */

import type { HttpTransport } from '../transport.js';
import type { AuditLogEntry, PageParams, Paged } from '../types.js';

export interface AuditLogQuery extends PageParams {
  action?: string;
  actor_id?: string;
  resource_type?: string;
  /** RFC3339 起始时间 */
  start?: string;
  /** RFC3339 结束时间 */
  end?: string;
}

export class AuditLogsClient {
  constructor(private readonly http: HttpTransport) {}

  /** 分页查询审计日志 */
  list(params?: AuditLogQuery): Promise<Paged<AuditLogEntry>> {
    return this.http.pagedGet<AuditLogEntry>('/api/core/business-tools/permissions/audit-logs', params);
  }

  /** 审计日志总数（同查询条件） */
  count(params?: Omit<AuditLogQuery, 'page' | 'page_size'>): Promise<{ count: number }> {
    return this.http.request('GET', `/api/core/business-tools/permissions/audit-logs/count${this.qs(params)}`);
  }

  /** 获取单条审计日志 */
  get(id: string): Promise<AuditLogEntry> {
    return this.http.request<AuditLogEntry>(
      'GET',
      `/api/core/business-tools/permissions/audit-logs/${encodeURIComponent(id)}`,
    );
  }

  /** NDJSON 流式导出审计日志（后端 /export?stream=true，V530g；for-await 风格逐行回调） */
  stream(params: AuditLogQuery, onItem: (item: AuditLogEntry) => void, signal?: AbortSignal): Promise<void> {
    const path = `/api/core/business-tools/permissions/audit-logs/export${this.qs({ ...params, stream: true })}`;
    return this.http.streamNdjson<AuditLogEntry>(path, onItem, signal);
  }

  /** 导出审计日志为 CSV/JSON（可选 gzip 压缩） */
  export(params: AuditLogQuery & { compressed?: boolean }): Promise<Response> {
    const path = `/api/core/business-tools/permissions/audit-logs/export${this.qs(params)}`;
    return this.http.fetchRaw(path);
  }

  private qs(params?: object): string {
    if (!params) return '';
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
    }
    const s = search.toString();
    return s ? `?${s}` : '';
  }
}
