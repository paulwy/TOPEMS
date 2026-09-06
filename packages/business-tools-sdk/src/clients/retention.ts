/** 保留策略 + 保留任务 + 导出任务 子客户端（V0.1） */

import type { HttpTransport } from '../transport.js';
import type { ExportTaskStatus, PageParams, Paged, RetentionPolicy, RetentionTaskStatus } from '../types.js';

export interface RetentionPolicyInput {
  name: string;
  days: number;
  enabled?: boolean;
}

/** 保留策略 CRUD + 启动时自动拉取 */
export class RetentionClient {
  constructor(private readonly http: HttpTransport) {}

  list(params?: PageParams): Promise<Paged<RetentionPolicy>> {
    return this.http.pagedGet<RetentionPolicy>('/api/core/business-tools/audit-logs/retention/policies', params);
  }

  get(id: string): Promise<RetentionPolicy> {
    return this.http.request<RetentionPolicy>(
      'GET',
      `/api/core/business-tools/audit-logs/retention/policies/${encodeURIComponent(id)}`,
    );
  }

  create(input: RetentionPolicyInput): Promise<RetentionPolicy> {
    return this.http.request<RetentionPolicy>('POST', '/api/core/business-tools/audit-logs/retention/policies', input);
  }

  update(id: string, input: Partial<RetentionPolicyInput>): Promise<RetentionPolicy> {
    return this.http.request<RetentionPolicy>(
      'PUT',
      `/api/core/business-tools/audit-logs/retention/policies/${encodeURIComponent(id)}`,
      input,
    );
  }

  delete(id: string): Promise<void> {
    return this.http.request<void>(
      'DELETE',
      `/api/core/business-tools/audit-logs/retention/policies/${encodeURIComponent(id)}`,
    );
  }
}

/** 定时清理任务控制 */
export class RetentionTaskClient {
  constructor(private readonly http: HttpTransport) {}

  status(): Promise<RetentionTaskStatus> {
    return this.http.request<RetentionTaskStatus>('GET', '/api/core/business-tools/audit-logs/retention/task/status');
  }

  start(): Promise<RetentionTaskStatus> {
    return this.http.request<RetentionTaskStatus>('POST', '/api/core/business-tools/audit-logs/retention/task/start');
  }

  stop(): Promise<RetentionTaskStatus> {
    return this.http.request<RetentionTaskStatus>('POST', '/api/core/business-tools/audit-logs/retention/task/stop');
  }

  triggerOnce(): Promise<{ processed: number }> {
    return this.http.request<{ processed: number }>(
      'POST',
      '/api/core/business-tools/audit-logs/retention/task/trigger-once',
    );
  }
}

/** 审计导出三件套控制（支持 NDJSON 流消费） */
export class ExportTaskClient {
  constructor(private readonly http: HttpTransport) {}

  list(params?: PageParams): Promise<Paged<ExportTaskStatus>> {
    return this.http.pagedGet<ExportTaskStatus>('/api/core/business-tools/audit-logs/export/tasks', params);
  }

  start(config: Record<string, unknown>): Promise<ExportTaskStatus> {
    return this.http.request<ExportTaskStatus>('POST', '/api/core/business-tools/audit-logs/export/tasks', config);
  }

  status(id: string): Promise<ExportTaskStatus> {
    return this.http.request<ExportTaskStatus>(
      'GET',
      `/api/core/business-tools/audit-logs/export/tasks/${encodeURIComponent(id)}`,
    );
  }

  stop(id: string): Promise<ExportTaskStatus> {
    return this.http.request<ExportTaskStatus>(
      'POST',
      `/api/core/business-tools/audit-logs/export/tasks/${encodeURIComponent(id)}/stop`,
    );
  }

  /** 流式下载导出结果（NDJSON 逐行） */
  stream(id: string, onItem: (line: Record<string, unknown>) => void, signal?: AbortSignal): Promise<void> {
    return this.http.streamNdjson<Record<string, unknown>>(
      `/api/core/business-tools/audit-logs/export/tasks/${encodeURIComponent(id)}/stream`,
      onItem,
      signal,
    );
  }
}
