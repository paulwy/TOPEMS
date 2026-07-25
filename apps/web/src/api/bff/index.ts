/**
 * V33.0 Portal BFF 聚合 API 客户端
 *
 * 提供两种聚合查询方式：
 * 1. REST 聚合 API — 简单的预定义聚合端点
 * 2. GraphQL 查询 — 灵活的按需字段查询
 *
 * 前端应优先使用 BFF 聚合 API 替代多次独立服务调用，
 * 减少 N+1 请求，提升页面加载性能。
 */

import { apiClient } from '../client';
import type { ApiResponse } from '../client';
import { performanceMark, performanceMeasure, parseQueryName } from '@/utils/graphql-performance';
import type { QueryPerformanceRecord } from '@/utils/graphql-performance';
import { logger } from '@/utils/logger';

const perfLogger = logger.child({ prefix: 'BFF-GraphQL' });

// ==================== V40.0: 性能监控回调注册 ====================

export type PerformanceCallback = (
  query: string,
  duration: number,
  success: boolean,
  cached: boolean,
  variables?: Record<string, unknown>,
  error?: string
) => void;

const performanceCallbacks = new Set<PerformanceCallback>();

/**
 * 注册性能监控回调
 * @returns 取消注册的函数
 */
export function onBffPerformance(callback: PerformanceCallback): () => void {
  performanceCallbacks.add(callback);
  return () => {
    performanceCallbacks.delete(callback);
  };
}

/**
 * 触发性能监控回调
 */
function notifyPerformance(
  query: string,
  duration: number,
  success: boolean,
  cached: boolean,
  variables?: Record<string, unknown>,
  error?: string
): void {
  performanceCallbacks.forEach((cb) => {
    try {
      cb(query, duration, success, cached, variables, error);
    } catch (e) {
      perfLogger.error('性能回调执行失败:', e);
    }
  });
}

// ==================== REST 聚合 API ====================

const portal = apiClient.portal;

export interface ServiceStats {
  service: string;
  total: number;
  active: number;
  available: boolean;
}

export interface BusinessStatsAggregation {
  erp: ServiceStats;
  crm: ServiceStats;
  hrm: ServiceStats;
  finance: ServiceStats;
  mes: ServiceStats;
  workflow: ServiceStats;
  fetched_at: string;
}

export interface UnifiedTodo {
  id: string;
  title: string;
  source: 'workflow' | 'portal' | 'notification';
  priority: number;
  status: string;
  created_at: string;
}

export const bffApi = {
  /** 获取跨服务业务统计数据（REST） */
  getBusinessStats: () =>
    portal.get<ApiResponse<BusinessStatsAggregation>>('/dashboard/business-stats'),

  /** 获取统一待办列表（REST） */
  getUnifiedTodos: () => portal.get<ApiResponse<UnifiedTodo[]>>('/dashboard/unified-todos'),
};

// ==================== GraphQL 查询 API ====================

// V35.0 Phase 6: Apollo 持久化查询（APQ）— 查询哈希缓存
// 避免重复计算同一查询的 SHA256 哈希
const queryHashCache = new Map<string, string>();

/**
 * 计算查询字符串的 SHA256 哈希（APQ 协议要求）
 */
async function computeQueryHash(query: string): Promise<string> {
  const cached = queryHashCache.get(query);
  if (cached) return cached;

  const encoder = new TextEncoder();
  const data = encoder.encode(query);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  queryHashCache.set(query, hashHex);
  return hashHex;
}

/**
 * 执行 GraphQL 请求（带 APQ 持久化查询支持）
 *
 * V35.0 Phase 6: 使用 Apollo Persisted Queries 协议
 * - 首次请求：发送查询哈希，若后端未缓存则回退到完整查询
 * - 后续请求：仅发送哈希，减少请求体积
 */
async function executeGraphQL<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/portal/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data as T;
}

/**
 * 执行 GraphQL 查询（V35.0: 自动启用 APQ 持久化查询）
 *
 * @example
 * const result = await bffGraphQL(`
 *   query {
 *     dashboard {
 *       stats { erp { available total } crm { available } }
 *       todos { id title source status }
 *       services { service healthy }
 *     }
 *   }
 * `);
 */
export async function bffGraphQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const operationName = parseQueryName(query);
  const markStart = `bff-gql-${operationName}-${Date.now()}-start`;
  performanceMark(markStart);

  const sha256Hash = await computeQueryHash(query);
  const persistedQuery = { version: 1, sha256Hash };

  let cached = false;
  let success = false;
  let errorMsg: string | undefined;

  try {
    // Step 1: 先尝试仅发送哈希（后端已缓存时直接返回结果）
    try {
      const result = await executeGraphQL<T>({
        query: '',
        variables,
        extensions: { persistedQuery },
      });
      cached = true;
      success = true;
      return result;
    } catch (err) {
      // Step 2: 若后端返回 PersistedQueryNotFound，回退到发送完整查询 + 哈希
      if (err instanceof Error && err.message.includes('PersistedQueryNotFound')) {
        cached = false;
        const result = await executeGraphQL<T>({
          query,
          variables,
          extensions: { persistedQuery },
        });
        success = true;
        return result;
      }
      // 其他错误直接抛出
      throw err;
    }
  } catch (err) {
    success = false;
    errorMsg = err instanceof Error ? err.message : String(err);
    throw err;
  } finally {
    const markEnd = `bff-gql-${operationName}-${Date.now()}-end`;
    performanceMark(markEnd);
    const duration = performanceMeasure(`bff-gql-${operationName}`, markStart, markEnd);
    // 如果 Performance API 不可用，用 Date.now 计算近似值
    const finalDuration = duration > 0 ? duration : 0;

    perfLogger.debug(
      `GraphQL 查询: ${operationName} - ${finalDuration.toFixed(0)}ms - ${success ? '成功' : '失败'} - ${cached ? '缓存命中' : '缓存未命中'}`
    );

    notifyPerformance(query, finalDuration, success, cached, variables, errorMsg);
  }
}

// ==================== 预定义 GraphQL 查询 ====================

/** 获取仪表盘复合视图（一次请求获取 stats + todos + services） */
export async function getDashboard() {
  return bffGraphQL<{
    stats: BusinessStatsAggregation;
    todos: UnifiedTodo[];
    services: Array<{ service: string; healthy: boolean; url: string }>;
  }>(`
    query Dashboard {
      dashboard {
        stats {
          erp { service total active available }
          crm { service total active available }
          hrm { service total active available }
          finance { service total active available }
          mes { service total active available }
          workflow { service total active available }
        }
        todos { id title source priority status created_at }
        services { service healthy url }
      }
    }
  `);
}

/** 仅获取业务统计数据（GraphQL） */
export async function getBusinessStatsGql() {
  return bffGraphQL<{
    erp: ServiceStats;
    crm: ServiceStats;
    hrm: ServiceStats;
    finance: ServiceStats;
    mes: ServiceStats;
    workflow: ServiceStats;
  }>(`
    query BusinessStats {
      businessStats {
        erp { service total active available }
        crm { service total active available }
        hrm { service total active available }
        finance { service total active available }
        mes { service total active available }
        workflow { service total active available }
      }
    }
  `);
}

/** 仅获取统一待办列表（GraphQL） */
export async function getUnifiedTodosGql() {
  return bffGraphQL<UnifiedTodo[]>(`
    query UnifiedTodos {
      unifiedTodos {
        id
        title
        source
        priority
        status
        created_at
      }
    }
  `);
}

/** 获取所有服务健康状态（GraphQL） */
export async function getServiceHealthGql() {
  return bffGraphQL<Array<{ service: string; healthy: boolean; url: string }>>(`
    query ServiceHealth {
      serviceHealth {
        service
        healthy
        url
      }
    }
  `);
}

/** V36.0: 获取扩展模块统计（GraphQL — 聚合 qms/srm/lims/rd/ehs） */
export async function getModuleStatsGql() {
  return bffGraphQL<Array<{ service: string; total: number; available: boolean }>>(`
    query ModuleStats {
      moduleStats {
        service
        total
        available
      }
    }
  `);
}

/** V36.0: 获取联邦服务注册表（GraphQL Federation） */
export async function getFederatedServicesGql() {
  return bffGraphQL<
    Array<{ service: string; url: string; available: boolean; entities: string[] }>
  >(`
    query FederatedServices {
      federatedServices {
        service
        url
        available
        entities
      }
    }
  `);
}

/** V36.0: 联邦实体查询（跨服务查询实体） */
export async function getFederatedEntityGql(service: string, entityType: string, id: string) {
  return bffGraphQL<{ service: string; entity_type: string; id: string; data: unknown }>(
    `
    query FederatedEntity($service: String!, $entityType: String!, $id: String!) {
      federatedEntity(service: $service, entityType: $entityType, id: $id) {
        service
        entity_type
        id
        data
      }
    }
  `,
    { service, entityType, id }
  );
}

// ==================== V34.0 GraphQL Mutations ====================

/** 创建待办事项（GraphQL Mutation） */
export async function createTodoGql(title: string, userId?: string) {
  return bffGraphQL<{
    createTodo: UnifiedTodo;
  }>(
    `
    mutation CreateTodo($title: String!, $userId: String) {
      createTodo(title: $title, userId: $userId) {
        id
        title
        source
        priority
        status
        created_at
      }
    }
  `,
    { title, userId }
  );
}

/** 完成待办事项（GraphQL Mutation） */
export async function completeTodoGql(id: string) {
  return bffGraphQL<{ completeTodo: boolean }>(
    `
    mutation CompleteTodo($id: String!) {
      completeTodo(id: $id)
    }
  `,
    { id }
  );
}

/** 删除待办事项（GraphQL Mutation） */
export async function deleteTodoGql(id: string) {
  return bffGraphQL<{ deleteTodo: boolean }>(
    `
    mutation DeleteTodo($id: String!) {
      deleteTodo(id: $id)
    }
  `,
    { id }
  );
}

// ==================== V34.0 GraphQL Subscription ====================

/**
 * 订阅服务健康状态变化（WebSocket）
 *
 * @example
 * const unsubscribe = subscribeServiceHealth((health) => {
 *   console.log(`${health.service}: ${health.healthy ? 'healthy' : 'down'}`);
 * });
 * // 清理时调用 unsubscribe()
 */
export function subscribeServiceHealth(
  callback: (health: { service: string; healthy: boolean; url: string }) => void
): () => void {
  const wsUrl = `ws://${window.location.host}/api/portal/graphql/ws`;
  let ws: WebSocket | null = null;
  let closed = false;

  const connect = () => {
    if (closed) return;
    ws = new WebSocket(wsUrl, ['graphql-transport-ws']);

    ws.onopen = () => {
      ws?.send(JSON.stringify({ type: 'connection_init', payload: {} }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'connection_ack') {
          ws?.send(
            JSON.stringify({
              id: 'service-health-sub',
              type: 'subscribe',
              payload: {
                query: `
                  subscription ServiceHealthChanged {
                    serviceHealthChanged {
                      service
                      healthy
                      url
                    }
                  }
                `,
              },
            })
          );
        } else if (msg.type === 'next' && msg.payload?.data?.serviceHealthChanged) {
          callback(msg.payload.data.serviceHealthChanged);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      if (!closed) {
        setTimeout(connect, 5000); // 自动重连
      }
    };
  };

  connect();

  return () => {
    closed = true;
    ws?.close();
  };
}

// ==================== V34.0 MDM AC-6: 主数据引用 API ====================

export interface MasterDataRef {
  master_data_id: string;
  tenant_id: string;
  domain: string;
  code: string;
  name?: string;
  status: string;
  source_service: string;
  local_entity_type?: string;
  local_entity_id?: string;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

// V35.0 AC-7: 审计追踪 + 数据血缘
export interface MasterDataAuditEvent {
  id: string;
  master_data_id: string;
  domain: string;
  action: string;
  source_service: string;
  target_service: string;
  changed_by?: string;
  old_values?: unknown;
  new_values?: unknown;
  created_at: string;
}

export interface DataLineageNode {
  service: string;
  domain: string;
  code: string;
  name?: string;
  status: string;
  local_entity_type?: string;
  local_entity_id?: string;
  last_synced_at: string;
}

export interface DataLineageResponse {
  master_data_id: string;
  source_service: string;
  domain: string;
  code: string;
  name?: string;
  references: DataLineageNode[];
  total_references: number;
}

// V36.0 AC-8: 主数据版本管理 + 回滚
export interface MasterDataVersion {
  id: string;
  master_data_id: string;
  version_number: number;
  domain: string;
  code: string;
  name?: string;
  status: string;
  snapshot: unknown;
  changed_by?: string;
  created_at: string;
}

export const masterDataApi = {
  /** 列出本地主数据引用 */
  list: (domain?: string, page?: number, pageSize?: number) =>
    apiClient.erp.get<
      ApiResponse<{
        items: MasterDataRef[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>
    >('/master-data-refs', { params: { domain, page, page_size: pageSize } }),

  /** 通过 master_data_id 查找 */
  getById: (masterDataId: string) =>
    apiClient.erp.get<ApiResponse<MasterDataRef>>(`/master-data-refs/${masterDataId}`),

  /** 通过 domain + code 查找 */
  getByCode: (domain: string, code: string) =>
    apiClient.erp.get<ApiResponse<MasterDataRef>>(`/master-data-refs/by-code/${domain}/${code}`),

  /** V35.0 AC-7: 查询主数据变更审计历史 */
  getAuditTrail: (masterDataId: string, page?: number, pageSize?: number) =>
    apiClient.erp.get<
      ApiResponse<{
        items: MasterDataAuditEvent[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>
    >(`/master-data-refs/${masterDataId}/audit-trail`, { params: { page, page_size: pageSize } }),

  /** V35.0 AC-7: 记录主数据变更审计事件 */
  recordAuditEvent: (data: {
    master_data_id: string;
    domain: string;
    action: string;
    source_service: string;
    target_service?: string;
    changed_by?: string;
    old_values?: unknown;
    new_values?: unknown;
  }) =>
    apiClient.erp.post<ApiResponse<MasterDataAuditEvent>>('/master-data-refs/audit-trail', data),

  /** V35.0 AC-7: 查询主数据血缘关系 */
  getLineage: (masterDataId: string) =>
    apiClient.erp.get<ApiResponse<DataLineageResponse>>(
      `/master-data-refs/${masterDataId}/lineage`
    ),

  /** V36.0 AC-8: 查询主数据版本历史 */
  getVersions: (masterDataId: string, page?: number, pageSize?: number) =>
    apiClient.erp.get<
      ApiResponse<{
        items: MasterDataVersion[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>
    >(`/master-data-refs/${masterDataId}/versions`, { params: { page, page_size: pageSize } }),

  /** V36.0 AC-8: 记录主数据版本快照 */
  recordVersion: (
    masterDataId: string,
    data: {
      domain: string;
      code: string;
      name?: string;
      status: string;
      snapshot: unknown;
      changed_by?: string;
    }
  ) =>
    apiClient.erp.post<ApiResponse<MasterDataVersion>>(
      `/master-data-refs/${masterDataId}/versions`,
      data
    ),

  /** V36.0 AC-8: 获取特定版本详情 */
  getVersion: (masterDataId: string, versionId: string) =>
    apiClient.erp.get<ApiResponse<MasterDataVersion>>(
      `/master-data-refs/${masterDataId}/versions/${versionId}`
    ),

  /** V36.0 AC-8: 回滚到指定版本 */
  rollbackToVersion: (masterDataId: string, versionId: string) =>
    apiClient.erp.post<
      ApiResponse<{
        rolled_back_to_version: number;
        new_version_number: number;
        master_data_id: string;
        domain: string;
        code: string;
        status: string;
        rolled_back_at: string;
      }>
    >(`/master-data-refs/${masterDataId}/versions/${versionId}/rollback`),

  // ==================== V37.0 AC-9: 冲突检测 + 自动合并 ====================

  /** V37.0 AC-9: 检测主数据冲突 */
  detectConflicts: (data: {
    master_data_id: string;
    remote_service: string;
    remote_data: Record<string, unknown>;
    merge_strategy?: 'last_write_wins' | 'source_priority' | 'manual_review';
  }) =>
    apiClient.erp.post<
      ApiResponse<{
        master_data_id: string;
        conflicts_detected: number;
        conflicts: MasterDataConflict[];
        auto_resolved: number;
        manual_review_required: number;
      }>
    >('/master-data-refs/conflicts/detect', data),

  /** V37.0 AC-9: 列出冲突记录 */
  listConflicts: (params?: {
    master_data_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }) =>
    apiClient.erp.get<
      ApiResponse<{
        items: MasterDataConflict[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>
    >('/master-data-refs/conflicts', { params }),

  /** V37.0 AC-9: 获取冲突详情 */
  getConflict: (conflictId: string) =>
    apiClient.erp.get<ApiResponse<MasterDataConflict>>(`/master-data-refs/conflicts/${conflictId}`),

  /** V37.0 AC-9: 手动解决冲突 */
  resolveConflict: (conflictId: string, data: { resolved_value: unknown; resolved_by?: string }) =>
    apiClient.erp.post<ApiResponse<unknown>>(
      `/master-data-refs/conflicts/${conflictId}/resolve`,
      data
    ),

  /** V37.0 AC-9: 自动合并冲突 */
  autoMergeConflict: (
    conflictId: string,
    data: {
      strategy?: 'last_write_wins' | 'source_priority' | 'manual_review';
      service_priorities?: Record<string, number>;
    }
  ) =>
    apiClient.erp.post<ApiResponse<unknown>>(
      `/master-data-refs/conflicts/${conflictId}/auto-merge`,
      data
    ),

  // ==================== V38.0 AC-10: 主数据生命周期管理 ====================

  /** V38.0 AC-10: 归档主数据 */
  archive: (masterDataId: string, data: { reason: string; archived_by?: string }) =>
    apiClient.erp.post<ApiResponse<MasterDataRef>>(
      `/master-data-refs/${masterDataId}/archive`,
      data
    ),

  /** V38.0 AC-10: 恢复已归档主数据 */
  restore: (masterDataId: string, data: { restored_by?: string; reason?: string }) =>
    apiClient.erp.post<ApiResponse<MasterDataRef>>(
      `/master-data-refs/${masterDataId}/restore`,
      data
    ),

  /** V38.0 AC-10: 安排销毁计划 */
  scheduleDestruction: (
    masterDataId: string,
    data: {
      scheduled_at?: string;
      reason: string;
      scheduled_by?: string;
    }
  ) =>
    apiClient.erp.post<ApiResponse<MasterDataRef>>(
      `/master-data-refs/${masterDataId}/schedule-destruction`,
      data
    ),

  /** V38.0 AC-10: 取消销毁计划 */
  cancelDestruction: (masterDataId: string) =>
    apiClient.erp.post<ApiResponse<MasterDataRef>>(
      `/master-data-refs/${masterDataId}/cancel-destruction`,
      {}
    ),

  /** V38.0 AC-10: 执行销毁（软删除） */
  destroy: (masterDataId: string, data: { destroyed_by?: string; reason?: string }) =>
    apiClient.erp.post<ApiResponse<MasterDataRef>>(
      `/master-data-refs/${masterDataId}/destroy`,
      data
    ),

  /** V38.0 AC-10: 列出已归档主数据 */
  listArchived: (params?: {
    domain?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
  }) =>
    apiClient.erp.get<
      ApiResponse<{
        items: MasterDataRef[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>
    >('/master-data-refs/archived', { params }),

  /** V38.0 AC-10: 列出待销毁主数据 */
  listPendingDestruction: (params?: {
    domain?: string;
    keyword?: string;
    page?: number;
    page_size?: number;
  }) =>
    apiClient.erp.get<
      ApiResponse<{
        items: MasterDataRef[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>
    >('/master-data-refs/pending-destruction', { params }),

  // ==================== V39.0 AC-11: 主数据质量规则引擎 ====================

  /** V39.0 AC-11: 创建质量规则 */
  createQualityRule: (data: {
    name: string;
    description?: string;
    domain: string;
    field_name: string;
    rule_type: 'required' | 'format' | 'range' | 'uniqueness' | 'reference' | 'custom';
    severity?: 'error' | 'warning' | 'info';
    config?: Record<string, unknown>;
    is_active?: boolean;
  }) => apiClient.erp.post<ApiResponse<QualityRule>>('/master-data-refs/quality-rules', data),

  /** V39.0 AC-11: 列出质量规则（支持 domain 过滤 + 分页） */
  listQualityRules: (params?: {
    domain?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }) =>
    apiClient.erp.get<
      ApiResponse<{
        items: QualityRule[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>
    >('/master-data-refs/quality-rules', { params }),

  /** V39.0 AC-11: 获取质量规则详情 */
  getQualityRule: (ruleId: string) =>
    apiClient.erp.get<ApiResponse<QualityRule>>(`/master-data-refs/quality-rules/${ruleId}`),

  /** V39.0 AC-11: 更新质量规则 */
  updateQualityRule: (
    ruleId: string,
    data: {
      name?: string;
      description?: string;
      domain?: string;
      field_name?: string;
      rule_type?: 'required' | 'format' | 'range' | 'uniqueness' | 'reference' | 'custom';
      severity?: 'error' | 'warning' | 'info';
      config?: Record<string, unknown>;
      is_active?: boolean;
    }
  ) =>
    apiClient.erp.put<ApiResponse<QualityRule>>(`/master-data-refs/quality-rules/${ruleId}`, data),

  /** V39.0 AC-11: 删除质量规则 */
  deleteQualityRule: (ruleId: string) =>
    apiClient.erp.delete<ApiResponse<{ rule_id: string; deleted: boolean }>>(
      `/master-data-refs/quality-rules/${ruleId}`
    ),

  /** V39.0 AC-11: 执行质量检查 */
  runQualityCheck: (params: { domain?: string; rule_ids?: string[] }) =>
    apiClient.erp.post<ApiResponse<QualityReport>>('/master-data-refs/quality-check', params),

  /** V39.0 AC-11: 查询质量报告（分页 + domain 过滤） */
  getQualityReport: (params?: { domain?: string; page?: number; page_size?: number }) =>
    apiClient.erp.get<
      ApiResponse<{
        items: QualityReport[];
        total: number;
        page: number;
        page_size: number;
        total_pages: number;
      }>
    >('/master-data-refs/quality-report', { params }),

  // ==================== V40.0 AC-12: 主数据治理仪表盘 + 数据资产目录 + 血缘可视化 ====================

  /** V40.0 AC-12: 获取治理仪表盘统计数据 */
  getGovernanceDashboard: () =>
    apiClient.erp.get<ApiResponse<GovernanceDashboardStats>>(
      '/master-data-refs/governance/dashboard'
    ),

  /** V40.0 AC-12: 列出数据资产目录 */
  listDataAssets: (params?: { domain?: string }) =>
    apiClient.erp.get<ApiResponse<DataAssetSummary[]>>('/master-data-refs/governance/assets', {
      params,
    }),

  /** V40.0 AC-12: 获取数据资产详情 */
  getDataAssetDetail: (domain: string) =>
    apiClient.erp.get<ApiResponse<DataAssetSummary>>(
      `/master-data-refs/governance/assets/${domain}`
    ),

  /** V40.0 AC-12: 获取血缘图 */
  getLineageGraph: (params?: { master_data_id?: string; domain?: string; depth?: number }) =>
    apiClient.erp.get<ApiResponse<LineageGraph>>('/master-data-refs/governance/lineage', {
      params,
    }),

  /** V40.0 AC-12: 获取上游血缘 */
  getLineageUpstream: (id: string) =>
    apiClient.erp.get<ApiResponse<LineageGraph>>(
      `/master-data-refs/governance/lineage/${id}/upstream`
    ),

  /** V40.0 AC-12: 获取下游血缘 */
  getLineageDownstream: (id: string) =>
    apiClient.erp.get<ApiResponse<LineageGraph>>(
      `/master-data-refs/governance/lineage/${id}/downstream`
    ),

  /** V40.0 AC-12: 获取质量趋势 */
  getQualityTrend: (params?: { period?: '7d' | '30d' | '90d'; domain?: string }) =>
    apiClient.erp.get<ApiResponse<QualityTrend>>('/master-data-refs/governance/quality-trend', {
      params,
    }),
};

// V37.0 AC-9: 主数据冲突类型
export interface MasterDataConflict {
  id: string;
  master_data_id: string;
  domain: string;
  conflict_type: string;
  field_name: string;
  local_value: unknown;
  remote_value: unknown;
  remote_service: string;
  status: string;
  merge_strategy: string;
  resolved_value?: unknown;
  detected_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

// V39.0 AC-11: 主数据质量规则引擎类型
export interface QualityRule {
  id: string;
  name: string;
  description: string;
  domain: string;
  field_name: string;
  rule_type: 'required' | 'format' | 'range' | 'uniqueness' | 'reference' | 'custom';
  severity: 'error' | 'warning' | 'info';
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QualityIssue {
  rule_id: string;
  rule_name: string;
  master_data_id: string;
  field_name: string;
  current_value?: string;
  expected: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

export interface QualityReport {
  id: string;
  domain?: string;
  total_checked: number;
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: QualityIssue[];
  generated_at: string;
}

// ==================== V40.0 AC-12: 主数据治理仪表盘 + 数据资产目录 + 血缘可视化 ====================

export interface GovernanceDashboardStats {
  total_domains: number;
  total_records: number;
  active_records: number;
  archived_records: number;
  pending_destruction: number;
  destroyed_records: number;
  quality_rules_count: number;
  quality_issues_count: number;
  quality_score: number;
  conflict_count: number;
  unresolved_conflicts: number;
  version_count: number;
  audit_events_last_7d: number;
  synced_services: string[];
  sync_coverage: number;
}

export interface DataAssetField {
  field_name: string;
  field_label: string;
  data_type: string;
  is_required: boolean;
  description?: string;
}

export interface DataAssetSummary {
  domain: string;
  domain_name: string;
  record_count: number;
  active_count: number;
  quality_score: number;
  last_updated?: string;
  owner_service: string;
  fields: DataAssetField[];
}

export interface LineageNode {
  id: string;
  label: string;
  node_type: 'master_data' | 'service' | 'system';
  domain?: string;
  service?: string;
}

export interface LineageEdge {
  source: string;
  target: string;
  edge_type: 'sync' | 'reference' | 'dependency';
  direction: 'upstream' | 'downstream';
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export interface QualityTrendPoint {
  date: string;
  quality_score: number;
  issues_count: number;
  checked_count: number;
}

export interface QualityTrend {
  period: string;
  points: QualityTrendPoint[];
  trend_direction: 'improving' | 'stable' | 'declining';
}

// ==================== V37.0 Phase 7: Apollo Federation v2 GraphQL 查询 ====================

/** V37.0: 获取组合后的联邦 Schema SDL */
export async function getFederationSdl() {
  return bffGraphQL<{ federationSdl: string }>(`
    query FederationSdl {
      federationSdl
    }
  `);
}

/** V37.0: 获取各服务的 SDL 片段 */
export async function getFederationServiceSdls() {
  return bffGraphQL<Array<{ service: string; sdl: string; available: boolean }>>(`
    query FederationServiceSdls {
      federationServiceSdls {
        service
        sdl
        available
      }
    }
  `);
}

/** V37.0: 批量解析联邦实体 */
export async function getFederationEntities(
  representations: Array<{ __typename: string; id: string }>
) {
  return bffGraphQL<Array<{ __typename: string; entity: unknown }>>(
    `
    query FederationEntities($representations: [JSON!]!) {
      federationEntities(representations: $representations) {
        __typename
        entity
      }
    }
  `,
    { representations }
  );
}

/** V37.0: 按 ID 获取 Customer 联邦实体 */
export async function getCustomerEntityGql(id: string) {
  return bffGraphQL<{
    customerEntity: { id: string; name: string; code: string; status: string } | null;
  }>(
    `
    query CustomerEntity($id: String!) {
      customerEntity(id: $id) {
        id
        name
        code
        status
      }
    }
  `,
    { id }
  );
}

/** V37.0: 按 ID 获取 Employee 联邦实体 */
export async function getEmployeeEntityGql(id: string) {
  return bffGraphQL<{
    employeeEntity: {
      id: string;
      name: string;
      department: string;
      position: string;
    } | null;
  }>(
    `
    query EmployeeEntity($id: String!) {
      employeeEntity(id: $id) {
        id
        name
        department
        position
      }
    }
  `,
    { id }
  );
}

/** V37.0: 按 ID 获取 Voucher 联邦实体 */
export async function getVoucherEntityGql(id: string) {
  return bffGraphQL<{
    voucherEntity: {
      id: string;
      voucher_number: string;
      total_debit: number;
      total_credit: number;
      status: string;
    } | null;
  }>(
    `
    query VoucherEntity($id: String!) {
      voucherEntity(id: $id) {
        id
        voucher_number
        total_debit
        total_credit
        status
      }
    }
  `,
    { id }
  );
}

// ==================== V38.0 Track B: 联邦批量实体查询 ====================

/** V38.0: 批量获取同类型实体列表 */
export async function getFederationEntityList(service: string, entityType: string, ids: string[]) {
  return bffGraphQL<Array<{ service: string; entity_type: string; id: string; data: unknown }>>(
    `
    query FederationEntityList($service: String!, $entityType: String!, $ids: [String!]!) {
      federationEntityList(service: $service, entityType: $entityType, ids: $ids) {
        service
        entity_type
        id
        data
      }
    }
  `,
    { service, entityType, ids }
  );
}

// ==================== V39.0 Track D: 通用实体列表查询 ====================

/** V39.0: 通用实体列表查询参数 */
export interface ListEntitiesParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  filter?: Record<string, unknown>;
}

/** V39.0: 通用实体列表查询结果 */
export interface ListEntitiesResult<T = unknown> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * V39.0: 通用实体列表查询（BFF GraphQL）
 *
 * 通过 BFF 聚合层查询指定服务的实体列表，支持分页与过滤。
 * 替代前端直接调用各服务 REST API，统一走 BFF GraphQL 出口。
 *
 * @param service 服务名，如 'erp' | 'crm' | 'hrm' | 'finance' | 'mes'
 * @param entityType 实体类型，如 'customers' | 'employees' | 'vouchers'
 * @param params 分页与过滤参数
 */
export async function listEntitiesGql<T = unknown>(
  service: string,
  entityType: string,
  params?: ListEntitiesParams
): Promise<ListEntitiesResult<T>> {
  const result = await bffGraphQL<{
    entityList: { items: T[]; total: number; page: number; pageSize: number };
  }>(
    `
    query EntityList(
      $service: String!
      $entityType: String!
      $page: Int
      $pageSize: Int
      $keyword: String
      $filter: JSON
    ) {
      entityList(
        service: $service
        entityType: $entityType
        page: $page
        pageSize: $pageSize
        keyword: $keyword
        filter: $filter
      ) {
        items
        total
        page
        pageSize
      }
    }
  `,
    {
      service,
      entityType,
      page: params?.page,
      pageSize: params?.pageSize,
      keyword: params?.keyword,
      filter: params?.filter,
    }
  );
  return result.entityList;
}

// ==================== V38.0 Track D: 通用实体 CRUD Mutations ====================

/** V38.0: 创建实体（通用 CRUD） */
export async function createEntityGql(
  service: string,
  entityType: string,
  data: Record<string, unknown>
) {
  return bffGraphQL<{ createEntity: unknown }>(
    `
    mutation CreateEntity($service: String!, $entityType: String!, $data: JSON!) {
      createEntity(service: $service, entityType: $entityType, data: $data)
    }
  `,
    { service, entityType, data }
  );
}

/** V38.0: 更新实体（通用 CRUD） */
export async function updateEntityGql(
  service: string,
  entityType: string,
  id: string,
  data: Record<string, unknown>
) {
  return bffGraphQL<{ updateEntity: unknown }>(
    `
    mutation UpdateEntity($service: String!, $entityType: String!, $id: String!, $data: JSON!) {
      updateEntity(service: $service, entityType: $entityType, id: $id, data: $data)
    }
  `,
    { service, entityType, id, data }
  );
}

/** V38.0: 删除实体（通用 CRUD） */
export async function deleteEntityGql(service: string, entityType: string, id: string) {
  return bffGraphQL<{ deleteEntity: boolean }>(
    `
    mutation DeleteEntity($service: String!, $entityType: String!, $id: String!) {
      deleteEntity(service: $service, entityType: $entityType, id: $id)
    }
  `,
    { service, entityType, id }
  );
}

// ==================== V38.0 Track E: Subscription 生产化 ====================

/** V38.0: 获取订阅统计（WS 连接数 + 活跃订阅数） */
export async function getSubscriptionStats(): Promise<{
  ws_connections: number;
  active_subscriptions: number;
  timestamp: string;
}> {
  const response = await fetch('/api/portal/graphql/subscription-stats');
  if (!response.ok) {
    return { ws_connections: 0, active_subscriptions: 0, timestamp: '' };
  }
  return response.json();
}

/**
 * V38.0: 带指数退避重连的服务健康订阅
 *
 * 相比基础版 subscribeServiceHealth，增加了：
 * - 指数退避重连策略（初始 1s，最大 30s）
 * - 连接状态回调
 * - 更健壮的错误处理
 *
 * @param callback 健康状态回调
 * @param onStatusChange 连接状态变化回调
 * @returns 清理函数
 */
export function subscribeServiceHealthWithRetry(
  callback: (health: { service: string; healthy: boolean; url: string }) => void,
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected' | 'reconnecting') => void
): () => void {
  const wsUrl = `ws://${window.location.host}/api/portal/graphql/ws`;
  let ws: WebSocket | null = null;
  let closed = false;
  let reconnectDelay = 1000;
  const maxReconnectDelay = 30000;

  const connect = () => {
    if (closed) return;

    onStatusChange?.('connecting');
    ws = new WebSocket(wsUrl, ['graphql-transport-ws']);

    ws.onopen = () => {
      reconnectDelay = 1000;
      onStatusChange?.('connected');
      ws?.send(JSON.stringify({ type: 'connection_init', payload: {} }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'connection_ack') {
          ws?.send(
            JSON.stringify({
              id: 'service-health-sub',
              type: 'subscribe',
              payload: {
                query: `
                  subscription ServiceHealthChanged {
                    serviceHealthChanged {
                      service
                      healthy
                      url
                    }
                  }
                `,
              },
            })
          );
        } else if (msg.type === 'next' && msg.payload?.data?.serviceHealthChanged) {
          callback(msg.payload.data.serviceHealthChanged);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      onStatusChange?.(closed ? 'disconnected' : 'reconnecting');
      if (!closed) {
        setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
          connect();
        }, reconnectDelay);
      }
    };

    ws.onerror = () => {
      // 错误会触发 onclose，重连逻辑在那里处理
    };
  };

  connect();

  return () => {
    closed = true;
    onStatusChange?.('disconnected');
    ws?.close();
  };
}

// ==================== V37.0 Phase 7: 所有列表页统计迁移到 BFF ====================

/**
 * V37.0: GraphQL 订阅 CDN 缓存失效
 *
 * 订阅 WebSocket 推送时，后端递增缓存版本号。
 * 前端可轮询 cache-version 端点或监听 WebSocket 事件，
 * 当版本号变化时触发 React Query 缓存失效。
 */

/** 获取当前 CDN 缓存版本号 */
export async function getCacheVersion(): Promise<number> {
  const response = await fetch('/api/portal/graphql/cache-version', {
    headers: { 'Cache-Control': 'no-cache' },
  });
  if (!response.ok) return 0;
  const json = await response.json();
  return json.cache_version as number;
}

/**
 * V37.0: 启动缓存版本轮询
 *
 * 定期检查 CDN 缓存版本号，当版本号变化时调用 onInvalidate 回调。
 * 前端可在 onInvalidate 中调用 queryClient.invalidateQueries() 刷新数据。
 *
 * @param onInvalidate 缓存失效回调
 * @param intervalMs 轮询间隔（毫秒），默认 30 秒
 * @returns 清理函数（停止轮询）
 */
export function startCacheVersionPolling(onInvalidate: () => void, intervalMs = 30000): () => void {
  let lastVersion = 0;
  let stopped = false;

  const poll = async () => {
    if (stopped) return;
    try {
      const version = await getCacheVersion();
      if (lastVersion > 0 && version > lastVersion) {
        // 缓存版本递增，触发失效
        onInvalidate();
      }
      lastVersion = version;
    } catch {
      // 忽略轮询错误
    }
  };

  // 立即执行一次获取初始版本号
  poll();
  const timer = setInterval(poll, intervalMs);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

/**
 * V37.0: 统一列表页统计聚合查询
 *
 * 通过 BFF GraphQL 一次性获取所有列表页所需的统计数据，
 * 替代前端逐个服务调用 REST API，大幅减少请求数。
 *
 * 包含：
 * - 核心业务统计（erp/crm/hrm/finance/mes/workflow）
 * - 扩展模块统计（qms/srm/lims/rd/ehs）
 * - 服务健康状态
 */
export async function getAllListPageStats() {
  return bffGraphQL<{
    businessStats: {
      erp: ServiceStats;
      crm: ServiceStats;
      hrm: ServiceStats;
      finance: ServiceStats;
      mes: ServiceStats;
      workflow: ServiceStats;
    };
    moduleStats: Array<{ service: string; total: number; available: boolean }>;
    serviceHealth: Array<{ service: string; healthy: boolean; url: string }>;
  }>(`
    query AllListPageStats {
      businessStats {
        erp { service total active available }
        crm { service total active available }
        hrm { service total active available }
        finance { service total active available }
        mes { service total active available }
        workflow { service total active available }
      }
      moduleStats {
        service
        total
        available
      }
      serviceHealth {
        service
        healthy
        url
      }
    }
  `);
}

/**
 * V37.0: 联邦仪表盘视图
 *
 * 通过一次 GraphQL 查询获取：
 * - 跨服务业务统计
 * - 统一待办列表
 * - 服务健康状态
 * - 扩展模块统计
 * - 联邦服务注册表
 */
export async function getFederatedDashboard() {
  return bffGraphQL<{
    dashboard: {
      stats: {
        erp: ServiceStats;
        crm: ServiceStats;
        hrm: ServiceStats;
        finance: ServiceStats;
        mes: ServiceStats;
        workflow: ServiceStats;
      };
      todos: UnifiedTodo[];
      services: Array<{ service: string; healthy: boolean; url: string }>;
    };
    moduleStats: Array<{ service: string; total: number; available: boolean }>;
    federatedServices: Array<{
      service: string;
      url: string;
      available: boolean;
      entities: string[];
    }>;
  }>(`
    query FederatedDashboard {
      dashboard {
        stats {
          erp { service total active available }
          crm { service total active available }
          hrm { service total active available }
          finance { service total active available }
          mes { service total active available }
          workflow { service total active available }
        }
        todos { id title source priority status created_at }
        services { service healthy url }
      }
      moduleStats {
        service
        total
        available
      }
      federatedServices {
        service
        url
        available
        entities
      }
    }
  `);
}

// ==================== V40.0 Phase 10: Federation 网关查询优化 ====================

/**
 * V40.0: 获取实体关系图
 *
 * 返回所有联邦实体及其关系的可视化数据，
 * 可用于绘制实体关系图（ER图）。
 */
export interface EntityRelation {
  from_type: string;
  to_type: string;
  relation_type: string;
  from_field: string;
  to_field: string;
  service: string;
}

export interface EntityRelationshipGraph {
  entities: string[];
  relations: EntityRelation[];
}

export async function getEntityRelationshipGraph(): Promise<EntityRelationshipGraph> {
  const result = await bffGraphQL<{ entityRelationshipGraph: EntityRelationshipGraph }>(`
    query EntityRelationshipGraph {
      entityRelationshipGraph {
        entities
        relations {
          from_type
          to_type
          relation_type
          from_field
          to_field
          service
        }
      }
    }
  `);
  return result.entityRelationshipGraph;
}

/**
 * V40.0: 获取联邦网关性能统计
 *
 * 返回联邦网关的性能指标，包括：
 * - 总请求数
 * - 缓存命中/未命中数
 * - 平均解析时间
 * - 已解析实体数
 * - 跨服务 Join 数
 */
export interface FederationStats {
  total_requests: number;
  cache_hits: number;
  cache_misses: number;
  avg_resolution_time_ms: number;
  entities_resolved: number;
  cross_service_joins: number;
}

export async function getFederationStats(): Promise<FederationStats> {
  const result = await bffGraphQL<{ federationStats: FederationStats }>(`
    query FederationStats {
      federationStats {
        total_requests
        cache_hits
        cache_misses
        avg_resolution_time_ms
        entities_resolved
        cross_service_joins
      }
    }
  `);
  return result.federationStats;
}

/**
 * V40.0: 带缓存的联邦仪表盘视图
 *
 * 相比 getFederatedDashboard，此版本额外包含：
 * - 联邦网关性能统计
 * - 实体关系图（可选）
 *
 * 使用 APQ 缓存优化，减少重复查询的网络传输。
 */
export async function getFederatedDashboardV2() {
  return bffGraphQL<{
    dashboard: {
      stats: {
        erp: ServiceStats;
        crm: ServiceStats;
        hrm: ServiceStats;
        finance: ServiceStats;
        mes: ServiceStats;
        workflow: ServiceStats;
      };
      todos: UnifiedTodo[];
      services: Array<{ service: string; healthy: boolean; url: string }>;
    };
    moduleStats: Array<{ service: string; total: number; available: boolean }>;
    federatedServices: Array<{
      service: string;
      url: string;
      available: boolean;
      entities: string[];
    }>;
    federationStats: FederationStats;
  }>(`
    query FederatedDashboardV2 {
      dashboard {
        stats {
          erp { service total active available }
          crm { service total active available }
          hrm { service total active available }
          finance { service total active available }
          mes { service total active available }
          workflow { service total active available }
        }
        todos { id title source priority status created_at }
        services { service healthy url }
      }
      moduleStats {
        service
        total
        available
      }
      federatedServices {
        service
        url
        available
        entities
      }
      federationStats {
        total_requests
        cache_hits
        cache_misses
        avg_resolution_time_ms
        entities_resolved
        cross_service_joins
      }
    }
  `);
}

// ==================== V39.0 Phase 9: 多频道事件驱动 Subscription ====================

/**
 * V39.0: 事件频道类型与 payload 定义
 */

/** 主数据变更事件 */
export interface MasterDataEvent {
  domain: string;
  action: string;
  master_data_id: string;
  source_service: string;
  timestamp: string;
}

/** 通知接收事件 */
export interface NotificationEvent {
  id: string;
  user_id: string;
  title: string;
  content: string;
  notification_type: string;
  timestamp: string;
}

/** 工作流任务分配事件 */
export interface WorkflowTaskEvent {
  task_id: string;
  assignee_id: string;
  instance_title: string;
  priority: string;
  status: string;
  timestamp: string;
}

/** 订单状态变更事件 */
export interface OrderStatusEvent {
  order_id: string;
  order_type: string;
  old_status: string;
  new_status: string;
  timestamp: string;
}

/**
 * 获取可用事件频道列表
 */
export async function getEventChannels(): Promise<{
  channels: Array<{
    name: string;
    description: string;
    filter: string | null;
  }>;
  websocket_url: string;
  timestamp: string;
}> {
  const response = await fetch('/api/portal/graphql/events');
  if (!response.ok) {
    return { channels: [], websocket_url: '/api/portal/graphql/ws', timestamp: '' };
  }
  return response.json();
}

/**
 * 创建通用 GraphQL WebSocket 订阅
 *
 * 内部使用 graphql-transport-ws 协议，支持自动重连。
 */
function createGraphQLSubscription<T>(
  subscriptionQuery: string,
  variables: Record<string, unknown>,
  callback: (data: T) => void,
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void
): () => void {
  const wsUrl = `ws://${window.location.host}/api/portal/graphql/ws`;
  let ws: WebSocket | null = null;
  let closed = false;
  let reconnectDelay = 1000;
  const maxReconnectDelay = 30000;

  const connect = () => {
    if (closed) return;
    onStatusChange?.('connecting');
    ws = new WebSocket(wsUrl, ['graphql-transport-ws']);

    ws.onopen = () => {
      reconnectDelay = 1000;
      onStatusChange?.('connected');
      ws?.send(JSON.stringify({ type: 'connection_init', payload: {} }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'connection_ack') {
          ws?.send(
            JSON.stringify({
              id: `sub-${Date.now()}`,
              type: 'subscribe',
              payload: { query: subscriptionQuery, variables },
            })
          );
        } else if (msg.type === 'next' && msg.payload?.data) {
          const data = Object.values(msg.payload.data)[0];
          if (data) callback(data as T);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      onStatusChange?.('disconnected');
      if (!closed) {
        setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
          connect();
        }, reconnectDelay);
      }
    };

    ws.onerror = () => {
      // 错误会触发 onclose，重连逻辑在那里处理
    };
  };

  connect();

  return () => {
    closed = true;
    onStatusChange?.('disconnected');
    ws?.close();
  };
}

/** 订阅主数据变更事件 */
export function subscribeMasterDataChanged(
  callback: (event: MasterDataEvent) => void,
  domain?: string,
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void
): () => void {
  return createGraphQLSubscription<MasterDataEvent>(
    `
    subscription MasterDataChanged($domain: String) {
      masterDataChanged(domain: $domain) {
        domain
        action
        master_data_id
        source_service
        timestamp
      }
    }
    `,
    { domain: domain ?? null },
    callback,
    onStatusChange
  );
}

/** 订阅通知接收事件 */
export function subscribeNotificationReceived(
  userId: string,
  callback: (event: NotificationEvent) => void,
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void
): () => void {
  return createGraphQLSubscription<NotificationEvent>(
    `
    subscription NotificationReceived($userId: String!) {
      notificationReceived(userId: $userId) {
        id
        user_id
        title
        content
        notification_type
        timestamp
      }
    }
    `,
    { userId },
    callback,
    onStatusChange
  );
}

/** 订阅工作流任务分配事件 */
export function subscribeWorkflowTaskAssigned(
  assigneeId: string,
  callback: (event: WorkflowTaskEvent) => void,
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void
): () => void {
  return createGraphQLSubscription<WorkflowTaskEvent>(
    `
    subscription WorkflowTaskAssigned($assigneeId: String!) {
      workflowTaskAssigned(assigneeId: $assigneeId) {
        task_id
        assignee_id
        instance_title
        priority
        status
        timestamp
      }
    }
    `,
    { assigneeId },
    callback,
    onStatusChange
  );
}

/** 订阅订单状态变更事件 */
export function subscribeOrderStatusChanged(
  callback: (event: OrderStatusEvent) => void,
  orderType?: string,
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void
): () => void {
  return createGraphQLSubscription<OrderStatusEvent>(
    `
    subscription OrderStatusChanged($orderType: String) {
      orderStatusChanged(orderType: $orderType) {
        order_id
        order_type
        old_status
        new_status
        timestamp
      }
    }
    `,
    { orderType: orderType ?? null },
    callback,
    onStatusChange
  );
}

/** 发布主数据变更事件（GraphQL Mutation） */
export async function publishMasterDataEvent(data: {
  domain: string;
  action: string;
  master_data_id: string;
  source_service: string;
}): Promise<MasterDataEvent> {
  const result = await bffGraphQL<{ publishMasterDataEvent: MasterDataEvent }>(
    `
    mutation PublishMasterDataEvent(
      $domain: String!
      $action: String!
      $masterDataId: String!
      $sourceService: String!
    ) {
      publishMasterDataEvent(
        domain: $domain
        action: $action
        masterDataId: $masterDataId
        sourceService: $sourceService
      ) {
        domain
        action
        master_data_id
        source_service
        timestamp
      }
    }
    `,
    {
      domain: data.domain,
      action: data.action,
      masterDataId: data.master_data_id,
      sourceService: data.source_service,
    }
  );
  return result.publishMasterDataEvent;
}

/** 发布通知事件（GraphQL Mutation） */
export async function publishNotification(data: {
  user_id: string;
  title: string;
  content: string;
  notification_type: string;
}): Promise<NotificationEvent> {
  const result = await bffGraphQL<{ publishNotification: NotificationEvent }>(
    `
    mutation PublishNotification(
      $userId: String!
      $title: String!
      $content: String!
      $notificationType: String!
    ) {
      publishNotification(
        userId: $userId
        title: $title
        content: $content
        notificationType: $notificationType
      ) {
        id
        user_id
        title
        content
        notification_type
        timestamp
      }
    }
    `,
    {
      userId: data.user_id,
      title: data.title,
      content: data.content,
      notificationType: data.notification_type,
    }
  );
  return result.publishNotification;
}

/** 发布工作流任务事件（GraphQL Mutation） */
export async function publishWorkflowTask(data: {
  task_id: string;
  assignee_id: string;
  instance_title: string;
  priority: string;
  status: string;
}): Promise<WorkflowTaskEvent> {
  const result = await bffGraphQL<{ publishWorkflowTask: WorkflowTaskEvent }>(
    `
    mutation PublishWorkflowTask(
      $taskId: String!
      $assigneeId: String!
      $instanceTitle: String!
      $priority: String!
      $status: String!
    ) {
      publishWorkflowTask(
        taskId: $taskId
        assigneeId: $assigneeId
        instanceTitle: $instanceTitle
        priority: $priority
        status: $status
      ) {
        task_id
        assignee_id
        instance_title
        priority
        status
        timestamp
      }
    }
    `,
    {
      taskId: data.task_id,
      assigneeId: data.assignee_id,
      instanceTitle: data.instance_title,
      priority: data.priority,
      status: data.status,
    }
  );
  return result.publishWorkflowTask;
}

/** 发布订单状态变更事件（GraphQL Mutation） */
export async function publishOrderStatus(data: {
  order_id: string;
  order_type: string;
  old_status: string;
  new_status: string;
}): Promise<OrderStatusEvent> {
  const result = await bffGraphQL<{ publishOrderStatus: OrderStatusEvent }>(
    `
    mutation PublishOrderStatus(
      $orderId: String!
      $orderType: String!
      $oldStatus: String!
      $newStatus: String!
    ) {
      publishOrderStatus(
        orderId: $orderId
        orderType: $orderType
        oldStatus: $oldStatus
        newStatus: $newStatus
      ) {
        order_id
        order_type
        old_status
        new_status
        timestamp
      }
    }
    `,
    {
      orderId: data.order_id,
      orderType: data.order_type,
      oldStatus: data.old_status,
      newStatus: data.new_status,
    }
  );
  return result.publishOrderStatus;
}

// ==================== V39.0 Track E: GraphQL Persisted Queries 生产化 ====================

/**
 * V39.0: 查询白名单状态
 *
 * 返回白名单是否启用、已注册的查询哈希数量、以及前 10 个哈希预览。
 */
export interface WhitelistStatus {
  enabled: boolean;
  size: number;
  preview: string[];
}

/**
 * V39.0: 查询审计日志条目
 */
export interface QueryAuditLog {
  query_hash: string | null;
  operation_name: string | null;
  complexity: number;
  depth: number;
  duration_ms: number;
  user_id: string | null;
  timestamp: string;
  success: boolean;
}

/**
 * V39.0: 审计日志查询响应
 */
export interface AuditLogResponse {
  logs: QueryAuditLog[];
  count: number;
  total: number;
}

/**
 * V39.0: 获取查询白名单状态
 *
 * @example
 * const status = await getWhitelistStatus();
 * console.log(`白名单${status.enabled ? '已启用' : '未启用'}, ${status.size} 个查询`);
 */
export async function getWhitelistStatus(): Promise<WhitelistStatus> {
  const response = await fetch('/api/portal/graphql/whitelist');
  if (!response.ok) {
    return { enabled: false, size: 0, preview: [] };
  }
  return response.json();
}

/**
 * V39.0: 添加查询哈希到白名单
 *
 * @param hash 查询的 SHA-256 哈希值
 * @returns 添加结果（包含新的白名单大小）
 *
 * @example
 * const result = await addToWhitelist('a1b2c3...');
 * if (result.success) console.log(`白名单现有 ${result.size} 个查询`);
 */
export async function addToWhitelist(hash: string): Promise<{
  success: boolean;
  hash?: string;
  size?: number;
  error?: string;
}> {
  const response = await fetch('/api/portal/graphql/whitelist/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hash }),
  });
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }
  return response.json();
}

/**
 * V39.0: 获取查询审计日志
 *
 * @param limit 返回的最大条数（默认 50，最大 1000）
 * @returns 审计日志列表（按时间倒序）
 *
 * @example
 * const { logs, total } = await getAuditLogs(100);
 * logs.forEach(log => console.log(`${log.timestamp} ${log.success ? '✓' : '✗'} ${log.duration_ms}ms`));
 */
export async function getAuditLogs(limit = 50): Promise<AuditLogResponse> {
  const response = await fetch(`/api/portal/graphql/audit-logs?limit=${limit}`);
  if (!response.ok) {
    return { logs: [], count: 0, total: 0 };
  }
  return response.json();
}

// ==================== V40.0 Track E: GraphQL 安全管理 API ====================

/**
 * V40.0: 安全统计数据
 */
export interface SecurityStats {
  total_security_events: number;
  depth_exceeded_count: number;
  complexity_exceeded_count: number;
  rate_limit_exceeded_count: number;
  ip_blacklisted_count: number;
  hash_mismatch_count: number;
  ip_blacklist_size: number;
  rate_limit_per_minute: number;
  max_query_depth: number;
  max_query_complexity: number;
}

/**
 * V40.0: 安全事件条目
 */
export interface SecurityEvent {
  event_type: string;
  ip: string | null;
  query_hash: string | null;
  details: string;
  timestamp: string;
}

/**
 * V40.0: 安全事件查询响应
 */
export interface SecurityEventsResponse {
  events: SecurityEvent[];
  count: number;
  total: number;
}

/**
 * V40.0: IP 黑名单响应
 */
export interface IpBlacklistResponse {
  blacklist: string[];
  size: number;
}

/**
 * V40.0: 黑名单操作响应
 */
export interface BlacklistActionResponse {
  success: boolean;
  ip?: string;
  size?: number;
  error?: string;
}

/**
 * V40.0: 获取安全统计
 *
 * @example
 * const stats = await getSecurityStats();
 * console.log(`安全事件总数: ${stats.total_security_events}`);
 */
export async function getSecurityStats(): Promise<SecurityStats> {
  const response = await fetch('/api/portal/graphql/security/stats');
  if (!response.ok) {
    return {
      total_security_events: 0,
      depth_exceeded_count: 0,
      complexity_exceeded_count: 0,
      rate_limit_exceeded_count: 0,
      ip_blacklisted_count: 0,
      hash_mismatch_count: 0,
      ip_blacklist_size: 0,
      rate_limit_per_minute: 100,
      max_query_depth: 10,
      max_query_complexity: 1000,
    };
  }
  return response.json();
}

/**
 * V40.0: 获取安全事件列表
 *
 * @param limit 返回的最大条数（默认 50，最大 500）
 * @returns 安全事件列表（按时间倒序）
 *
 * @example
 * const { events, total } = await getSecurityEvents(100);
 * events.forEach(e => console.log(`${e.timestamp} ${e.event_type}: ${e.details}`));
 */
export async function getSecurityEvents(limit = 50): Promise<SecurityEventsResponse> {
  const response = await fetch(`/api/portal/graphql/security/events?limit=${limit}`);
  if (!response.ok) {
    return { events: [], count: 0, total: 0 };
  }
  return response.json();
}

/**
 * V40.0: 获取 IP 黑名单列表
 *
 * @example
 * const { blacklist, size } = await getIpBlacklist();
 * console.log(`黑名单共 ${size} 个 IP`);
 */
export async function getIpBlacklist(): Promise<IpBlacklistResponse> {
  const response = await fetch('/api/portal/graphql/security/blacklist');
  if (!response.ok) {
    return { blacklist: [], size: 0 };
  }
  return response.json();
}

/**
 * V40.0: 添加 IP 到黑名单
 *
 * @param ip 要添加的 IP 地址
 * @returns 操作结果
 *
 * @example
 * const result = await addToIpBlacklist('192.168.1.100');
 * if (result.success) console.log('添加成功');
 */
export async function addToIpBlacklist(ip: string): Promise<BlacklistActionResponse> {
  const response = await fetch('/api/portal/graphql/security/blacklist/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip }),
  });
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }
  return response.json();
}

/**
 * V40.0: 从黑名单移除 IP
 *
 * @param ip 要移除的 IP 地址
 * @returns 操作结果
 *
 * @example
 * const result = await removeFromIpBlacklist('192.168.1.100');
 * if (result.success) console.log('移除成功');
 */
export async function removeFromIpBlacklist(ip: string): Promise<BlacklistActionResponse> {
  const response = await fetch('/api/portal/graphql/security/blacklist/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip }),
  });
  if (!response.ok) {
    return { success: false, error: `HTTP ${response.status}` };
  }
  return response.json();
}

// ==================== V41.0 Track B: GraphQL 智能缓存 API ====================

export interface HotQuery {
  query_name: string;
  hit_count: number;
  avg_latency_ms: number;
}

export interface CacheStats {
  l1_size: number;
  l2_size: number;
  l1_hits: number;
  l2_hits: number;
  total_requests: number;
  hit_rate: number;
  evictions: number;
  avg_ttl_seconds: number;
  top_hot_queries: HotQuery[];
}

export interface CacheOptimizationSuggestion {
  suggestion: string;
  impact: 'high' | 'medium' | 'low';
  current_metric: string;
  expected_improvement: string;
}

export interface PrefetchTarget {
  query_name: string;
  query_hash: string;
  variables_template: Record<string, unknown>;
  priority: number;
}

export interface QueryPrefetchRule {
  trigger_query: string;
  prefetch_queries: PrefetchTarget[];
  confidence: number;
}

export interface CacheInvalidationRule {
  mutation_name: string;
  invalidation_patterns: string[];
  entity_type: string;
}

/**
 * V41.0: 获取缓存统计信息
 *
 * 返回多级缓存的运行状态，包括 L1/L2 大小、命中数、命中率、淘汰数等。
 */
export async function getCacheStats(): Promise<CacheStats> {
  const result = await bffGraphQL<{ cacheStats: CacheStats }>(`
    query CacheStats {
      cacheStats {
        l1_size
        l2_size
        l1_hits
        l2_hits
        total_requests
        hit_rate
        evictions
        avg_ttl_seconds
        top_hot_queries {
          query_name
          hit_count
          avg_latency_ms
        }
      }
    }
  `);
  return result.cacheStats;
}

/**
 * V41.0: 获取缓存优化建议
 *
 * 基于当前缓存运行状态，返回调优建议列表。
 */
export async function getCacheOptimizationSuggestions(): Promise<CacheOptimizationSuggestion[]> {
  const result = await bffGraphQL<{
    cacheOptimizationSuggestions: CacheOptimizationSuggestion[];
  }>(`
    query CacheOptimizationSuggestions {
      cacheOptimizationSuggestions {
        suggestion
        impact
        current_metric
        expected_improvement
      }
    }
  `);
  return result.cacheOptimizationSuggestions;
}

/**
 * V41.0: 手动失效缓存（按模式匹配）
 *
 * @param pattern 要失效的缓存键模式（子字符串匹配）
 * @returns 是否成功
 */
export async function invalidateCache(pattern: string): Promise<boolean> {
  const result = await bffGraphQL<{ cacheInvalidate: boolean }>(
    `
    mutation CacheInvalidate($pattern: String!) {
      cacheInvalidate(pattern: $pattern)
    }
  `,
    { pattern }
  );
  return result.cacheInvalidate;
}

/**
 * V41.0: 清空所有缓存
 *
 * @returns 是否成功
 */
export async function clearCache(): Promise<boolean> {
  const result = await bffGraphQL<{ cacheClear: boolean }>(`
    mutation CacheClear {
      cacheClear
    }
  `);
  return result.cacheClear;
}

/**
 * V41.0: 获取查询预取规则
 *
 * 返回当前配置的所有预取规则，包括触发查询、预取目标和置信度。
 */
export async function getPrefetchRules(): Promise<QueryPrefetchRule[]> {
  const result = await bffGraphQL<{ prefetchRules: QueryPrefetchRule[] }>(`
    query PrefetchRules {
      prefetchRules {
        trigger_query
        prefetch_queries {
          query_name
          query_hash
          variables_template
          priority
        }
        confidence
      }
    }
  `);
  return result.prefetchRules;
}

/**
 * V41.0: 获取缓存失效规则
 *
 * 返回所有预定义的 Mutation → 缓存失效 映射规则。
 */
export async function getCacheInvalidationRules(): Promise<CacheInvalidationRule[]> {
  const result = await bffGraphQL<{
    cacheInvalidationRules: CacheInvalidationRule[];
  }>(`
    query CacheInvalidationRules {
      cacheInvalidationRules {
        mutation_name
        invalidation_patterns
        entity_type
      }
    }
  `);
  return result.cacheInvalidationRules;
}

/**
 * V41.0: 触发查询预取
 *
 * 手动触发指定查询的预取规则，用于预热缓存。
 *
 * @param queryName 触发预取的查询名称
 * @returns 是否成功触发
 */
export async function triggerPrefetch(queryName: string): Promise<boolean> {
  const result = await bffGraphQL<{ prefetchTrigger: boolean }>(
    `
    mutation PrefetchTrigger($queryName: String!) {
      prefetchTrigger(queryName: $queryName)
    }
  `,
    { queryName }
  );
  return result.prefetchTrigger;
}

// ==================== V41.0 Track E: GraphQL 生产级运维 API ====================

/**
 * V41.0: 发现的查询
 */
export interface DiscoveredQuery {
  query_hash: string;
  query_name: string;
  first_seen: string;
  last_seen: string;
  call_count: string;
  avg_duration_ms: number;
  max_depth: number;
  avg_complexity: number;
  source_ip_count: number;
  status: 'new' | 'under_review' | 'approved' | 'rejected';
  reviewer: string | null;
  reviewed_at: string | null;
  auto_approved: boolean;
}

/**
 * V41.0: 发现的查询响应
 */
export interface DiscoveredQueriesResponse {
  queries: DiscoveredQuery[];
  count: number;
}

/**
 * V41.0: 自动审批策略
 */
export interface AutoApprovalPolicy {
  enabled: boolean;
  min_calls_for_auto: number;
  max_depth_for_auto: number;
  max_complexity_for_auto: number;
  unique_sources_min: number;
  min_age_hours: number;
}

/**
 * V41.0: 自动审批策略更新输入
 */
export interface AutoApprovalPolicyInput {
  enabled?: boolean;
  min_calls_for_auto?: number;
  max_depth_for_auto?: number;
  max_complexity_for_auto?: number;
  unique_sources_min?: number;
  min_age_hours?: number;
}

/**
 * V41.0: IP 统计
 */
export interface IpStat {
  ip: string;
  request_count: number;
  blocked_count: number;
  block_rate: number;
}

/**
 * V41.0: 每日安全统计
 */
export interface DailySecurityStat {
  date: string;
  total_requests: number;
  blocked_requests: number;
  block_rate: number;
}

/**
 * V41.0: 安全事件摘要
 */
export interface SecurityEventSummary {
  event_type: string;
  count: number;
  percentage: number;
  trend_direction: 'up' | 'down' | 'stable';
}

/**
 * V41.0: 安全审计报表
 */
export interface SecurityAuditReport {
  period: string;
  start_date: string;
  end_date: string;
  total_requests: number;
  blocked_requests: number;
  block_rate: number;
  top_blocked_ips: IpStat[];
  top_security_events: SecurityEventSummary[];
  trend: DailySecurityStat[];
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

/**
 * V41.0: 性能调优建议
 */
export interface PerformanceTuningSuggestion {
  id: string;
  category: 'caching' | 'query_complexity' | 'batching' | 'network' | 'resource';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  current_metric: string;
  expected_improvement: string;
  affected_queries: string[];
  implementation_hint: string;
}

/**
 * V41.0: 性能基线
 */
export interface PerformanceBaseline {
  avg_query_time_ms: number;
  p95_query_time_ms: number;
  p99_query_time_ms: number;
  cache_hit_rate: number;
  error_rate: number;
  throughput_per_min: number;
}

/**
 * V41.0: 性能分析
 */
export interface PerformanceAnalysis {
  total_suggestions: number;
  critical_issues: number;
  warning_issues: number;
  info_items: number;
  suggestions: PerformanceTuningSuggestion[];
  overall_score: number;
  performance_baseline: PerformanceBaseline;
}

/**
 * V41.0: 白名单健康度
 */
export interface WhitelistHealth {
  total_queries: number;
  whitelisted_queries: number;
  coverage_rate: number;
  hit_rate: number;
  growth_rate_7d: number;
  discovered_new: number;
  pending_review: number;
  auto_approved_count: number;
}

/**
 * V41.0: 获取发现的查询列表
 *
 * @param status 按状态筛选（可选）
 * @returns 发现的查询列表
 */
export async function getDiscoveredQueries(status?: string): Promise<DiscoveredQueriesResponse> {
  const url = status
    ? `/api/portal/graphql/ops/discovered-queries?status=${status}`
    : '/api/portal/graphql/ops/discovered-queries';
  const response = await fetch(url);
  if (!response.ok) {
    return { queries: [], count: 0 };
  }
  return response.json();
}

/**
 * V41.0: 审批通过发现的查询
 *
 * @param hash 查询哈希
 * @returns 操作结果
 */
export async function approveDiscoveredQuery(hash: string): Promise<{
  success: boolean;
  hash: string;
}> {
  const response = await fetch(`/api/portal/graphql/ops/discovered-queries/${hash}/approve`, {
    method: 'POST',
  });
  if (!response.ok) {
    return { success: false, hash };
  }
  return response.json();
}

/**
 * V41.0: 拒绝发现的查询
 *
 * @param hash 查询哈希
 * @returns 操作结果
 */
export async function rejectDiscoveredQuery(hash: string): Promise<{
  success: boolean;
  hash: string;
}> {
  const response = await fetch(`/api/portal/graphql/ops/discovered-queries/${hash}/reject`, {
    method: 'POST',
  });
  if (!response.ok) {
    return { success: false, hash };
  }
  return response.json();
}

/**
 * V41.0: 获取自动审批策略
 *
 * @returns 当前自动审批策略
 */
export async function getAutoApprovalPolicy(): Promise<AutoApprovalPolicy> {
  const response = await fetch('/api/portal/graphql/ops/auto-approval-policy');
  if (!response.ok) {
    return {
      enabled: true,
      min_calls_for_auto: 10,
      max_depth_for_auto: 5,
      max_complexity_for_auto: 100,
      unique_sources_min: 1,
      min_age_hours: 1,
    };
  }
  return response.json();
}

/**
 * V41.0: 更新自动审批策略
 *
 * @param policy 策略更新内容
 * @returns 更新后的策略
 */
export async function updateAutoApprovalPolicy(policy: AutoApprovalPolicyInput): Promise<{
  success: boolean;
  policy: AutoApprovalPolicy;
}> {
  const response = await fetch('/api/portal/graphql/ops/auto-approval-policy', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(policy),
  });
  if (!response.ok) {
    return {
      success: false,
      policy: {
        enabled: true,
        min_calls_for_auto: 10,
        max_depth_for_auto: 5,
        max_complexity_for_auto: 100,
        unique_sources_min: 1,
        min_age_hours: 1,
      },
    };
  }
  return response.json();
}

/**
 * V41.0: 手动触发自动审批扫描
 *
 * @returns 自动审批通过的数量
 */
export async function runAutoApprovalScan(): Promise<{
  success: boolean;
  approved_count: number;
}> {
  const response = await fetch('/api/portal/graphql/ops/auto-approval/scan', {
    method: 'POST',
  });
  if (!response.ok) {
    return { success: false, approved_count: 0 };
  }
  return response.json();
}

/**
 * V41.0: 获取安全审计报表
 *
 * @param period 报表周期：daily / weekly / monthly
 * @returns 安全审计报表
 */
export async function getSecurityAuditReport(
  period: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<SecurityAuditReport> {
  const response = await fetch(`/api/portal/graphql/ops/security-report?period=${period}`);
  if (!response.ok) {
    return {
      period,
      start_date: '',
      end_date: '',
      total_requests: 0,
      blocked_requests: 0,
      block_rate: 0,
      top_blocked_ips: [],
      top_security_events: [],
      trend: [],
      risk_level: 'low',
      recommendations: [],
    };
  }
  return response.json();
}

/**
 * V41.0: 获取性能调优建议
 *
 * @returns 性能调优建议列表
 */
export async function getPerformanceTuningSuggestions(): Promise<{
  suggestions: PerformanceTuningSuggestion[];
  count: number;
}> {
  const response = await fetch('/api/portal/graphql/ops/performance-tuning');
  if (!response.ok) {
    return { suggestions: [], count: 0 };
  }
  return response.json();
}

/**
 * V41.0: 获取完整性能分析
 *
 * @returns 性能分析报告
 */
export async function getPerformanceAnalysis(): Promise<PerformanceAnalysis> {
  const response = await fetch('/api/portal/graphql/ops/performance-analysis');
  if (!response.ok) {
    return {
      total_suggestions: 0,
      critical_issues: 0,
      warning_issues: 0,
      info_items: 0,
      suggestions: [],
      overall_score: 0,
      performance_baseline: {
        avg_query_time_ms: 0,
        p95_query_time_ms: 0,
        p99_query_time_ms: 0,
        cache_hit_rate: 0,
        error_rate: 0,
        throughput_per_min: 0,
      },
    };
  }
  return response.json();
}

/**
 * V41.0: 获取白名单健康度
 *
 * @returns 白名单健康度指标
 */
export async function getWhitelistHealth(): Promise<WhitelistHealth> {
  const response = await fetch('/api/portal/graphql/ops/whitelist-health');
  if (!response.ok) {
    return {
      total_queries: 0,
      whitelisted_queries: 0,
      coverage_rate: 0,
      hit_rate: 0,
      growth_rate_7d: 0,
      discovered_new: 0,
      pending_review: 0,
      auto_approved_count: 0,
    };
  }
  return response.json();
}

// ==================== V42.0 Track B: 联邦网关 V2 API ====================

/**
 * V42.0: 字段元数据
 */
export interface FieldMetadata {
  name: string;
  fieldType: string;
  nullable: boolean;
  isList: boolean;
}

/**
 * V42.0: 关系元数据
 */
export interface RelationMetadata {
  fieldName: string;
  targetEntity: string;
  targetService: string;
  relationType: string;
  resolverType: string;
}

/**
 * V42.0: 实体元数据
 */
export interface EntityMetadata {
  name: string;
  service: string;
  keyField: string;
  fields: FieldMetadata[];
  relations: RelationMetadata[];
  restEndpoint: string;
  listEndpoint: string;
  batchEndpoint: string | null;
}

/**
 * V42.0: 服务元数据
 */
export interface ServiceMetadata {
  name: string;
  baseUrl: string;
  entities: EntityMetadata[];
  healthCheckUrl: string | null;
  version: string;
}

/**
 * V42.0: 查询计划步骤
 */
export interface PlanStep {
  stepId: string;
  stepType: string;
  entity: string | null;
  service: string | null;
  dependsOn: string[];
  fields: string[];
  args: unknown;
}

/**
 * V42.0: 并行执行组
 */
export interface ParallelGroup {
  groupId: string;
  steps: string[];
  executionMode: string;
}

/**
 * V42.0: 联邦查询计划
 */
export interface FederationQueryPlan {
  queryHash: string;
  steps: PlanStep[];
  parallelGroups: ParallelGroup[];
  estimatedCost: number;
  estimatedDurationMs: number;
}

/**
 * V42.0: 联邦 V2 统计
 */
export interface FederationV2Stats {
  totalQueries: number;
  totalSteps: number;
  parallelSteps: number;
  batchResolutions: number;
  cacheHits: number;
  cacheMisses: number;
  avgPlanTimeMs: number;
  avgExecuteTimeMs: number;
  avgTotalTimeMs: number;
  planCacheHits: number;
  autoResolversUsed: number;
  servicesRegistered: number;
  entitiesRegistered: number;
}

/**
 * V42.0: 获取联邦查询计划（不执行）
 *
 * 解析查询字符串，生成执行计划（步骤 + 并行组 + 估算成本），但不实际执行。
 * 用于查询计划预览和调试。
 *
 * @param query GraphQL 查询字符串
 * @param variables 查询变量（JSON 字符串，可为空）
 * @returns 查询计划（步骤、并行组、估算成本）
 *
 * @example
 * const plan = await getFederationV2Plan('{ customer { id name } }', '{}');
 * console.log(`计划包含 ${plan.steps.length} 个步骤，估算耗时 ${plan.estimatedDurationMs}ms`);
 */
export async function getFederationV2Plan(
  query: string,
  variables: string = '{}'
): Promise<FederationQueryPlan> {
  const result = await bffGraphQL<{ federationV2Plan: FederationQueryPlan }>(
    `
    query FederationV2Plan($query: String!, $variables: String) {
      federationV2Plan(query: $query, variables: $variables) {
        queryHash
        steps {
          stepId
          stepType
          entity
          service
          dependsOn
          fields
          args
        }
        parallelGroups {
          groupId
          steps
          executionMode
        }
        estimatedCost
        estimatedDurationMs
      }
    }
  `,
    { query, variables }
  );
  return result.federationV2Plan;
}

/**
 * V42.0: 执行联邦查询
 *
 * 计划并执行联邦查询，返回合并后的 JSON 结果。
 * 内部使用查询计划缓存 + 并行执行。
 *
 * @param query GraphQL 查询字符串
 * @param variables 查询变量（JSON 字符串，可为空）
 * @returns 执行结果（JSON）
 *
 * @example
 * const result = await executeFederationV2Query('{ customer { id name } employee { id name } }');
 */
export async function executeFederationV2Query(
  query: string,
  variables: string = '{}'
): Promise<unknown> {
  const result = await bffGraphQL<{ federationV2Execute: unknown }>(
    `
    query FederationV2Execute($query: String!, $variables: String) {
      federationV2Execute(query: $query, variables: $variables)
    }
  `,
    { query, variables }
  );
  return result.federationV2Execute;
}

/**
 * V42.0: 获取联邦 V2 统计
 *
 * 返回联邦网关 V2 的运行统计，包括查询数、步骤数、缓存命中率等。
 *
 * @returns 联邦 V2 统计
 *
 * @example
 * const stats = await getFederationV2Stats();
 * console.log(`总查询: ${stats.totalQueries}, 缓存命中: ${stats.cacheHits}`);
 */
export async function getFederationV2Stats(): Promise<FederationV2Stats> {
  const result = await bffGraphQL<{ federationV2Stats: FederationV2Stats }>(`
    query FederationV2Stats {
      federationV2Stats {
        totalQueries
        totalSteps
        parallelSteps
        batchResolutions
        cacheHits
        cacheMisses
        avgPlanTimeMs
        avgExecuteTimeMs
        avgTotalTimeMs
        planCacheHits
        autoResolversUsed
        servicesRegistered
        entitiesRegistered
      }
    }
  `);
  return result.federationV2Stats;
}

/**
 * V42.0: 获取已注册的服务列表
 *
 * 返回联邦网关 V2 服务注册表中所有已注册的服务及其实体元数据。
 *
 * @returns 服务元数据列表
 *
 * @example
 * const services = await getRegisteredServices();
 * services.forEach(s => console.log(`${s.name}: ${s.entities.length} 个实体`));
 */
export async function getRegisteredServices(): Promise<ServiceMetadata[]> {
  const result = await bffGraphQL<{ registeredServices: ServiceMetadata[] }>(`
    query RegisteredServices {
      registeredServices {
        name
        baseUrl
        entities {
          name
          service
          keyField
          fields {
            name
            fieldType
            nullable
            isList
          }
          relations {
            fieldName
            targetEntity
            targetService
            relationType
            resolverType
          }
          restEndpoint
          listEndpoint
          batchEndpoint
        }
        healthCheckUrl
        version
      }
    }
  `);
  return result.registeredServices;
}

/**
 * V42.0: 获取实体元数据
 *
 * 按实体名查询其元数据（字段、关系、REST 端点等）。
 *
 * @param entityName 实体名（如 "Customer"、"Employee"）
 * @returns 实体元数据，未找到时返回 null
 *
 * @example
 * const meta = await getEntityMetadata('Customer');
 * if (meta) console.log(`Customer 有 ${meta.fields.length} 个字段`);
 */
export async function getEntityMetadata(entityName: string): Promise<EntityMetadata | null> {
  const result = await bffGraphQL<{ entityMetadata: EntityMetadata | null }>(
    `
    query EntityMetadata($entityName: String!) {
      entityMetadata(entityName: $entityName) {
        name
        service
        keyField
        fields {
          name
          fieldType
          nullable
          isList
        }
        relations {
          fieldName
          targetEntity
          targetService
          relationType
          resolverType
        }
        restEndpoint
        listEndpoint
        batchEndpoint
      }
    }
  `,
    { entityName }
  );
  return result.entityMetadata;
}

/**
 * V42.0: 获取自动组合的联邦 SDL
 *
 * 基于 SERVICE_REGISTRY 自动生成的联邦 Schema SDL，
 * 包含所有已注册服务的实体类型、查询入口和关系字段。
 *
 * @returns 联邦 SDL 字符串
 *
 * @example
 * const sdl = await getFederationV2Sdl();
 * console.log(sdl);
 */
export async function getFederationV2Sdl(): Promise<string> {
  const result = await bffGraphQL<{ federationV2Sdl: string }>(`
    query FederationV2Sdl {
      federationV2Sdl
    }
  `);
  return result.federationV2Sdl;
}

// ==================== V42.0 Track E: GraphQL 企业级安全 ====================

/** V42.0: 字段权限规则 */
export interface FieldPermission {
  entity_type: string;
  field_name: string;
  allowed_roles: string[];
  denied_roles: string[];
  condition: string | null;
}

/** V42.0: 掩码类型 */
export type MaskType = 'Full' | 'Partial' | 'Hash' | 'Truncate' | 'Null' | 'Range';

/** V42.0: 掩码规则 */
export interface MaskingRule {
  entity_type: string;
  field_name: string;
  mask_type: MaskType;
  exempt_roles: string[];
}

/** V42.0: 字段访问审计 */
export interface FieldAccessAudit {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_roles: string[];
  ip: string | null;
  entity_type: string;
  entity_id: string | null;
  field_name: string;
  access_result: string;
  mask_type: string | null;
  query_hash: string | null;
}

/** V42.0: 字段变更记录 */
export interface FieldChange {
  field_name: string;
  old_value: unknown;
  new_value: unknown;
  masked: boolean;
}

/** V42.0: 数据变更审计 */
export interface DataChangeAudit {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_roles: string[];
  entity_type: string;
  entity_id: string;
  operation: string;
  changed_fields: FieldChange[];
  mutation_name: string;
  query_hash: string | null;
}

/** V42.0: 安全配置 */
export interface SecurityConfig {
  field_permissions_enabled: boolean;
  data_masking_enabled: boolean;
  field_audit_enabled: boolean;
  data_change_audit_enabled: boolean;
  default_deny: boolean;
  audit_sensitive_fields_only: boolean;
}

/**
 * V42.0: 获取字段权限规则列表
 *
 * @param entityType 可选，按实体类型过滤
 * @returns 字段权限规则数组
 */
export async function getFieldPermissions(entityType?: string): Promise<FieldPermission[]> {
  const url = entityType
    ? `/api/portal/graphql/security/field-permissions?entity_type=${encodeURIComponent(entityType)}`
    : '/api/portal/graphql/security/field-permissions';
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.permissions ?? [];
}

/**
 * V42.0: 设置字段权限
 *
 * @param permission 字段权限规则
 * @returns 设置后的字段权限规则
 */
export async function setFieldPermission(
  permission: Omit<FieldPermission, 'condition'> & { condition?: string | null }
): Promise<{ success: boolean; permission: FieldPermission }> {
  const response = await fetch('/api/portal/graphql/security/field-permissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(permission),
  });
  if (!response.ok) {
    throw new Error(`设置字段权限失败: ${response.status}`);
  }
  return response.json();
}

/**
 * V42.0: 移除字段权限
 *
 * @param entityType 实体类型
 * @param fieldName 字段名
 * @returns 是否移除成功
 */
export async function removeFieldPermission(
  entityType: string,
  fieldName: string
): Promise<{ success: boolean; entity_type: string; field_name: string }> {
  const response = await fetch('/api/portal/graphql/security/field-permissions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_type: entityType, field_name: fieldName }),
  });
  if (!response.ok) {
    throw new Error(`移除字段权限失败: ${response.status}`);
  }
  return response.json();
}

/**
 * V42.0: 获取掩码规则列表
 *
 * @param entityType 可选，按实体类型过滤
 * @returns 掩码规则数组
 */
export async function getMaskingRules(entityType?: string): Promise<MaskingRule[]> {
  const url = entityType
    ? `/api/portal/graphql/security/masking-rules?entity_type=${encodeURIComponent(entityType)}`
    : '/api/portal/graphql/security/masking-rules';
  const response = await fetch(url);
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.rules ?? [];
}

/**
 * V42.0: 设置掩码规则
 *
 * @param rule 掩码规则
 * @returns 设置后的掩码规则
 */
export async function setMaskingRule(
  rule: MaskingRule
): Promise<{ success: boolean; rule: MaskingRule }> {
  const response = await fetch('/api/portal/graphql/security/masking-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule),
  });
  if (!response.ok) {
    throw new Error(`设置掩码规则失败: ${response.status}`);
  }
  return response.json();
}

/**
 * V42.0: 移除掩码规则
 *
 * @param entityType 实体类型
 * @param fieldName 字段名
 * @returns 是否移除成功
 */
export async function removeMaskingRule(
  entityType: string,
  fieldName: string
): Promise<{ success: boolean; entity_type: string; field_name: string }> {
  const response = await fetch('/api/portal/graphql/security/masking-rules', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity_type: entityType, field_name: fieldName }),
  });
  if (!response.ok) {
    throw new Error(`移除掩码规则失败: ${response.status}`);
  }
  return response.json();
}

/**
 * V42.0: 获取字段访问审计
 *
 * @param limit 返回条数上限（默认 100）
 * @param entityType 可选，按实体类型过滤
 * @returns 字段访问审计数组
 */
export async function getFieldAccessAudits(
  limit = 100,
  entityType?: string
): Promise<FieldAccessAudit[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (entityType) {
    params.set('entity_type', entityType);
  }
  const response = await fetch(
    `/api/portal/graphql/security/field-access-audits?${params.toString()}`
  );
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.audits ?? [];
}

/**
 * V42.0: 获取数据变更审计
 *
 * @param limit 返回条数上限（默认 100）
 * @param entityType 可选，按实体类型过滤
 * @returns 数据变更审计数组
 */
export async function getDataChangeAudits(
  limit = 100,
  entityType?: string
): Promise<DataChangeAudit[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (entityType) {
    params.set('entity_type', entityType);
  }
  const response = await fetch(
    `/api/portal/graphql/security/data-change-audits?${params.toString()}`
  );
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  return data.audits ?? [];
}

/**
 * V42.0: 获取安全配置
 *
 * @returns 安全配置
 */
export async function getSecurityConfig(): Promise<SecurityConfig> {
  const response = await fetch('/api/portal/graphql/security/config');
  if (!response.ok) {
    return {
      field_permissions_enabled: true,
      data_masking_enabled: true,
      field_audit_enabled: true,
      data_change_audit_enabled: true,
      default_deny: false,
      audit_sensitive_fields_only: true,
    };
  }
  return response.json();
}

/**
 * V42.0: 更新安全配置
 *
 * @param config 安全配置（部分字段可选，未提供则保持原值）
 * @returns 更新后的安全配置
 */
export async function updateSecurityConfig(
  config: Partial<SecurityConfig>
): Promise<{ success: boolean; config: SecurityConfig }> {
  const response = await fetch('/api/portal/graphql/security/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    throw new Error(`更新安全配置失败: ${response.status}`);
  }
  return response.json();
}

// ==================== V43.0 Track B: 订阅增强 API ====================

/** 数据变更事件 */
export interface DataChangeEvent {
  entity_type: string;
  entity_id: string;
  update_type: 'Created' | 'Updated' | 'Deleted' | 'Delta' | 'Full';
  data?: Record<string, unknown>;
  delta?: Record<string, unknown>;
  version: number;
  timestamp: string;
  source: string;
}

/** 订阅过滤器 */
export interface SubscriptionFilter {
  include_fields?: string[];
  exclude_fields?: string[];
  conditions?: Array<{
    field: string;
    operator: 'Eq' | 'Ne' | 'Gt' | 'Lt' | 'Gte' | 'Lte' | 'Contains' | 'In' | 'NotIn' | 'Regex';
    value: unknown;
  }>;
  deduplicate: boolean;
  dedup_key?: string;
}

/** 订阅信息 */
export interface SubscriptionInfo {
  id: string;
  operation_name?: string;
  query: string;
  variables?: Record<string, unknown>;
  channel: string;
  filter?: SubscriptionFilter;
  created_at: string;
  events_received: number;
  last_event_at?: string;
}

/** 订阅会话 */
export interface SubscriptionSession {
  session_id: string;
  connection_id: string;
  user_id?: string;
  subscription_count: number;
  subscriptions: SubscriptionInfo[];
  connected_at: string;
  last_active: string;
}

/** 频道统计 */
export interface ChannelStat {
  channel: string;
  subscription_count: number;
  events_published: number;
}

/** 订阅统计 */
export interface SubscriptionStats {
  total_sessions: number;
  total_subscriptions: number;
  active_connections: number;
  events_per_second: number;
  top_channels: ChannelStat[];
  buffered_events: number;
  total_events_published: number;
}

/**
 * V43.0: 订阅数据变更事件（WebSocket）
 *
 * 通用实体级实时数据推送，支持按 entity_type 和 update_type 过滤。
 *
 * @param callback 数据变更事件回调
 * @param entityType 可选，按实体类型过滤（如 'customer', 'order' 等）
 * @param updateType 可选，按更新类型过滤（Created/Updated/Deleted/Delta/Full）
 * @param onStatusChange 连接状态变化回调
 * @returns 清理函数
 */
export function subscribeDataChanged(
  callback: (event: DataChangeEvent) => void,
  entityType?: string,
  updateType?: string,
  onStatusChange?: (status: 'connecting' | 'connected' | 'disconnected') => void
): () => void {
  return createGraphQLSubscription<DataChangeEvent>(
    `
    subscription DataChanged($entityType: String, $updateType: String) {
      dataChanged(entityType: $entityType, updateType: $updateType) {
        entity_type
        entity_id
        update_type
        data
        delta
        version
        timestamp
        source
      }
    }
    `,
    { entityType: entityType ?? null, updateType: updateType ?? null },
    callback,
    onStatusChange
  );
}

/**
 * V43.0: 获取所有订阅会话
 */
export async function getSubscriptionSessions(): Promise<SubscriptionSession[]> {
  const result = await bffGraphQL<{ subscriptionSessions: SubscriptionSession[] }>(`
    query SubscriptionSessions {
      subscriptionSessions {
        session_id
        connection_id
        user_id
        subscription_count
        subscriptions {
          id
          operation_name
          query
          variables
          channel
          created_at
          events_received
          last_event_at
        }
        connected_at
        last_active
      }
    }
  `);
  return result.subscriptionSessions;
}

/**
 * V43.0: 获取订阅统计信息
 */
export async function getSubscriptionStatsGql(): Promise<SubscriptionStats> {
  const result = await bffGraphQL<{ subscriptionStats: SubscriptionStats }>(`
    query SubscriptionStats {
      subscriptionStats {
        total_sessions
        total_subscriptions
        active_connections
        events_per_second
        top_channels {
          channel
          subscription_count
          events_published
        }
        buffered_events
        total_events_published
      }
    }
  `);
  return result.subscriptionStats;
}

/**
 * V43.0: 取消指定订阅
 *
 * @param id 订阅 ID
 * @returns 是否成功取消
 */
export async function cancelSubscription(id: string): Promise<boolean> {
  const result = await bffGraphQL<{ cancelSubscription: boolean }>(
    `
    mutation CancelSubscription($id: String!) {
      cancelSubscription(id: $id)
    }
    `,
    { id }
  );
  return result.cancelSubscription;
}

/**
 * V43.0: 取消指定连接的所有订阅
 *
 * @param connectionId 连接 ID
 * @returns 取消的订阅数量
 */
export async function cancelAllSubscriptions(connectionId: string): Promise<number> {
  const result = await bffGraphQL<{ cancelAllSubscriptions: number }>(
    `
    mutation CancelAllSubscriptions($connectionId: String!) {
      cancelAllSubscriptions(connectionId: $connectionId)
    }
    `,
    { connectionId }
  );
  return result.cancelAllSubscriptions;
}

// ==================== V43.0 Track E: GraphQL AI 辅助 API ====================

/** V43.0: 查询优化建议 */
export interface QueryOptimizationSuggestion {
  id: string;
  query_hash: string;
  query_name: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  current_metric: string;
  expected_improvement: string;
  confidence: number;
  affected_queries: number;
  implementation_hint: string;
  code_snippet: string;
}

/** V43.0: 查询健康度评分 */
export interface QueryHealthScore {
  query_hash: string;
  overall_score: number;
  performance_score: number;
  cost_score: number;
  cache_score: number;
  security_score: number;
  maintainability_score: number;
  suggestions_count: number;
  critical_issues: number;
  warning_issues: number;
  last_analyzed: string;
}

/** V43.0: 优化路线图 */
export interface OptimizationRoadmap {
  total_suggestions: number;
  quick_wins: number;
  short_term: number;
  medium_term: number;
  long_term: number;
  estimated_improvement_pct: number;
}

/** V43.0: NL 过滤器 */
export interface NlFilter {
  field: string;
  operator: string;
  value: string;
}

/** V43.0: NL2GraphQL 解析结果 */
export interface Nl2GraphqlResult {
  query: string;
  variables: Record<string, unknown>;
  operation_type: string;
  entity_type: string;
  fields: string[];
  filters: NlFilter[];
  confidence: number;
  interpretation: string;
  suggestions: string[];
  alternative_queries: string[];
}

/** V43.0: 缓存推荐 */
export interface CacheRecommendation {
  query_hash: string;
  query_name: string;
  recommended_tier: string;
  current_tier: string;
  reason: string;
  expected_hit_rate: number;
  expected_latency_reduction_pct: number;
  confidence: number;
  supporting_data: Record<string, unknown>;
}

/** V43.0: 缓存推荐报告 */
export interface CacheRecommendationReport {
  total_queries: number;
  recommended_changes: number;
  quick_wins: number;
  total_queries_analyzed: number;
  estimated_overall_hit_rate_improvement: number;
  estimated_latency_reduction_pct: number;
  recommendations: CacheRecommendation[];
}

/** V43.0: AI 优化统计 */
export interface AiOptimizationStats {
  total_queries_analyzed: number;
  total_suggestions: number;
  critical_issues: number;
  warning_issues: number;
  avg_health_score: number;
  n_plus_one_detected: number;
  overfetching_detected: number;
  cache_recommendations: number;
  nl_queries_processed: number;
  nl_confidence_avg: number;
}

/**
 * V43.0: 获取查询优化建议
 *
 * @param queryHash 查询哈希，不传则返回所有建议
 */
export async function getQueryOptimizationSuggestions(
  queryHash?: string
): Promise<QueryOptimizationSuggestion[]> {
  const result = await bffGraphQL<{ queryOptimizationSuggestions: QueryOptimizationSuggestion[] }>(
    `
    query QueryOptimizationSuggestions($queryHash: String) {
      queryOptimizationSuggestions(queryHash: $queryHash) {
        id
        query_hash
        query_name
        category
        severity
        title
        description
        current_metric
        expected_improvement
        confidence
        affected_queries
        implementation_hint
        code_snippet
      }
    }
    `,
    { queryHash: queryHash ?? null }
  );
  return result.queryOptimizationSuggestions;
}

/**
 * V43.0: 获取查询健康度评分
 *
 * @param queryHash 查询哈希
 */
export async function getQueryHealthScore(queryHash: string): Promise<QueryHealthScore | null> {
  const result = await bffGraphQL<{ queryHealthScore: QueryHealthScore | null }>(
    `
    query QueryHealthScore($queryHash: String!) {
      queryHealthScore(queryHash: $queryHash) {
        query_hash
        overall_score
        performance_score
        cost_score
        cache_score
        security_score
        maintainability_score
        suggestions_count
        critical_issues
        warning_issues
        last_analyzed
      }
    }
    `,
    { queryHash }
  );
  return result.queryHealthScore;
}

/**
 * V43.0: 获取优化路线图
 */
export async function getOptimizationRoadmap(): Promise<OptimizationRoadmap> {
  const result = await bffGraphQL<{ optimizationRoadmap: OptimizationRoadmap }>(
    `
    query OptimizationRoadmap {
      optimizationRoadmap {
        total_suggestions
        quick_wins
        short_term
        medium_term
        long_term
        estimated_improvement_pct
      }
    }
    `
  );
  return result.optimizationRoadmap;
}

/**
 * V43.0: 自然语言转 GraphQL（中英文）
 *
 * @param naturalLanguage 自然语言查询
 */
export async function nl2graphql(naturalLanguage: string): Promise<Nl2GraphqlResult> {
  const result = await bffGraphQL<{ nl2graphql: Nl2GraphqlResult }>(
    `
    query Nl2Graphql($naturalLanguage: String!) {
      nl2graphql(naturalLanguage: $naturalLanguage) {
        query
        variables
        operation_type
        entity_type
        fields
        filters {
          field
          operator
          value
        }
        confidence
        interpretation
        suggestions
        alternative_queries
      }
    }
    `,
    { naturalLanguage }
  );
  return result.nl2graphql;
}

/**
 * V43.0: 获取智能缓存推荐报告
 */
export async function getCacheRecommendations(): Promise<CacheRecommendationReport> {
  const result = await bffGraphQL<{ cacheRecommendations: CacheRecommendationReport }>(
    `
    query CacheRecommendations {
      cacheRecommendations {
        total_queries
        recommended_changes
        quick_wins
        total_queries_analyzed
        estimated_overall_hit_rate_improvement
        estimated_latency_reduction_pct
        recommendations {
          query_hash
          query_name
          recommended_tier
          current_tier
          reason
          expected_hit_rate
          expected_latency_reduction_pct
          confidence
          supporting_data
        }
      }
    }
    `
  );
  return result.cacheRecommendations;
}

/**
 * V43.0: 获取 AI 优化统计总览
 */
export async function getAiOptimizationStats(): Promise<AiOptimizationStats> {
  const result = await bffGraphQL<{ aiOptimizationStats: AiOptimizationStats }>(
    `
    query AiOptimizationStats {
      aiOptimizationStats {
        total_queries_analyzed
        total_suggestions
        critical_issues
        warning_issues
        avg_health_score
        n_plus_one_detected
        overfetching_detected
        cache_recommendations
        nl_queries_processed
        nl_confidence_avg
      }
    }
    `
  );
  return result.aiOptimizationStats;
}

/**
 * V43.0: 应用查询优化建议
 *
 * @param queryHash 查询哈希
 * @param suggestionId 建议 ID
 * @returns 是否成功
 */
export async function applyOptimization(queryHash: string, suggestionId: string): Promise<boolean> {
  const result = await bffGraphQL<{ applyOptimization: boolean }>(
    `
    mutation ApplyOptimization($queryHash: String!, $suggestionId: String!) {
      applyOptimization(queryHash: $queryHash, suggestionId: $suggestionId)
    }
    `,
    { queryHash, suggestionId }
  );
  return result.applyOptimization;
}

/**
 * V43.0: 生成缓存推荐
 *
 * @returns 推荐变更数
 */
export async function generateCacheRecommendations(): Promise<number> {
  const result = await bffGraphQL<{ generateCacheRecommendations: number }>(
    `
    mutation GenerateCacheRecommendations {
      generateCacheRecommendations
    }
    `
  );
  return result.generateCacheRecommendations;
}

/**
 * V43.0: 接受缓存推荐
 *
 * @param queryHash 查询哈希
 * @returns 是否成功
 */
export async function acceptCacheRecommendation(queryHash: string): Promise<boolean> {
  const result = await bffGraphQL<{ acceptCacheRecommendation: boolean }>(
    `
    mutation AcceptCacheRecommendation($queryHash: String!) {
      acceptCacheRecommendation(queryHash: $queryHash)
    }
    `,
    { queryHash }
  );
  return result.acceptCacheRecommendation;
}

// ==================== V44.0 Track B: Federation V3 — 分布式查询计划 + 容错降级 + 缓存 + 监控 ====================

/** V44.0: V3 查询计划节点 */
export interface PlanNodeV3 {
  id: string;
  step_type: string;
  service: string | null;
  entity: string | null;
  fields: string[];
  depends_on: string[];
  children: string[];
  estimated_latency_ms: number;
}

/** V44.0: 查询依赖图 */
export interface QueryDependencyGraphV3 {
  nodes: string[];
  edges: string[];
  critical_path: string[];
  depth: number;
}

/** V44.0: V3 联邦查询计划 */
export interface FederationV3Plan {
  plan_id: string;
  query_hash: string;
  root_steps: string[];
  execution_order: string[];
  total_services: number;
  estimated_cost: number;
  parallel_groups: string[];
  nodes: PlanNodeV3[];
  dependency_graph: QueryDependencyGraphV3;
  execution_strategy: string;
}

/** V44.0: 熔断器状态 */
export interface CircuitBreakerState {
  service: string;
  state: string;
  failure_count: number;
  success_count: number;
  last_failure_time: string;
  last_state_change: string;
  failure_threshold: number;
  timeout_ms: number;
}

/** V44.0: 熔断器配置输入 */
export interface CircuitBreakerConfigInput {
  failure_threshold: number;
  success_threshold: number;
  timeout_ms: number;
  half_open_max_calls: number;
}

/** V44.0: 服务统计 */
export interface FederationServiceStats {
  service_name: string;
  request_count: number;
  success_count: number;
  failure_count: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  circuit_breaker_state: string;
}

/** V44.0: V3 网关统计 */
export interface FederationV3Stats {
  total_queries: number;
  cache_hits: number;
  cache_misses: number;
  total_latency_ms: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  service_stats: FederationServiceStats[];
  plan_count: number;
  avg_plan_time_ms: number;
  avg_execute_time_ms: number;
  circuit_breaker_trips: number;
  fallback_uses: number;
}

/** V44.0: 计划步骤轨迹 */
export interface PlanStepTrace {
  step_id: string;
  step_type: string;
  service: string | null;
  start_time: string;
  end_time: string;
  duration_ms: number;
  status: string;
  error_message: string | null;
  cached: boolean;
}

/** V44.0: 计划执行轨迹 */
export interface PlanExecutionTrace {
  plan_id: string;
  query_hash: string;
  total_time_ms: number;
  step_traces: PlanStepTrace[];
  cache_hits: number;
  services_used: string[];
  errors: string[];
  created_at: string;
}

/** V44.0: 缓存统计 */
export interface FederationCacheStats {
  query_cache_size: number;
  query_cache_max_size: number;
  query_cache_hit_rate: number;
  entity_cache_size: number;
  entity_cache_max_size: number;
  total_cache_hits: number;
  total_cache_misses: number;
}

/**
 * V44.0: 生成 V3 联邦查询计划
 *
 * @param query 查询字符串
 * @returns V3 查询计划
 */
export async function getFederationV3Plan(query: string): Promise<FederationV3Plan> {
  const result = await bffGraphQL<{ federationV3Plan: FederationV3Plan }>(
    `
    query FederationV3Plan($query: String!) {
      federationV3Plan(query: $query) {
        plan_id
        query_hash
        root_steps
        execution_order
        total_services
        estimated_cost
        parallel_groups
        nodes {
          id
          step_type
          service
          entity
          fields
          depends_on
          children
          estimated_latency_ms
        }
        dependency_graph {
          nodes
          edges
          critical_path
          depth
        }
        execution_strategy
      }
    }
    `,
    { query }
  );
  return result.federationV3Plan;
}

/**
 * V44.0: 执行 V3 联邦查询
 *
 * @param query 查询字符串
 * @returns 查询结果
 */
export async function executeFederationV3(query: string): Promise<unknown> {
  const result = await bffGraphQL<{ federationV3Execute: unknown }>(
    `
    query FederationV3Execute($query: String!) {
      federationV3Execute(query: $query)
    }
    `,
    { query }
  );
  return result.federationV3Execute;
}

/**
 * V44.0: 获取 V3 网关统计
 *
 * @returns V3 统计信息
 */
export async function getFederationV3Stats(): Promise<FederationV3Stats> {
  const result = await bffGraphQL<{ federationV3Stats: FederationV3Stats }>(
    `
    query FederationV3Stats {
      federationV3Stats {
        total_queries
        cache_hits
        cache_misses
        total_latency_ms
        avg_latency_ms
        p95_latency_ms
        service_stats {
          service_name
          request_count
          success_count
          failure_count
          avg_latency_ms
          p95_latency_ms
          circuit_breaker_state
        }
        plan_count
        avg_plan_time_ms
        avg_execute_time_ms
        circuit_breaker_trips
        fallback_uses
      }
    }
    `
  );
  return result.federationV3Stats;
}

/**
 * V44.0: 获取执行轨迹列表
 *
 * @param limit 限制数量
 * @returns 执行轨迹列表
 */
export async function getFederationV3Traces(limit = 20): Promise<PlanExecutionTrace[]> {
  const result = await bffGraphQL<{ federationV3Traces: PlanExecutionTrace[] }>(
    `
    query FederationV3Traces($limit: Int) {
      federationV3Traces(limit: $limit) {
        plan_id
        query_hash
        total_time_ms
        step_traces {
          step_id
          step_type
          service
          start_time
          end_time
          duration_ms
          status
          error_message
          cached
        }
        cache_hits
        services_used
        errors
        created_at
      }
    }
    `,
    { limit }
  );
  return result.federationV3Traces;
}

/**
 * V44.0: 获取所有熔断器状态
 *
 * @returns 熔断器状态列表
 */
export async function getFederationCircuitBreakers(): Promise<CircuitBreakerState[]> {
  const result = await bffGraphQL<{ federationCircuitBreakers: CircuitBreakerState[] }>(
    `
    query FederationCircuitBreakers {
      federationCircuitBreakers {
        service
        state
        failure_count
        success_count
        last_failure_time
        last_state_change
        failure_threshold
        timeout_ms
      }
    }
    `
  );
  return result.federationCircuitBreakers;
}

/**
 * V44.0: 获取缓存统计
 *
 * @returns 缓存统计信息
 */
export async function getFederationCacheStats(): Promise<FederationCacheStats> {
  const result = await bffGraphQL<{ federationCacheStats: FederationCacheStats }>(
    `
    query FederationCacheStats {
      federationCacheStats {
        query_cache_size
        query_cache_max_size
        query_cache_hit_rate
        entity_cache_size
        entity_cache_max_size
        total_cache_hits
        total_cache_misses
      }
    }
    `
  );
  return result.federationCacheStats;
}

/**
 * V44.0: 重置熔断器
 *
 * @param service 服务名
 * @returns 是否成功
 */
export async function resetFederationCircuitBreaker(service: string): Promise<boolean> {
  const result = await bffGraphQL<{ federationResetCircuitBreaker: boolean }>(
    `
    mutation ResetFederationCircuitBreaker($service: String!) {
      federationResetCircuitBreaker(service: $service)
    }
    `,
    { service }
  );
  return result.federationResetCircuitBreaker;
}

/**
 * V44.0: 失效查询缓存
 *
 * @param queryHash 查询哈希（可选，不传则清除所有）
 * @returns 是否成功
 */
export async function invalidateFederationCache(queryHash?: string): Promise<boolean> {
  const result = await bffGraphQL<{ federationCacheInvalidate: boolean }>(
    `
    mutation InvalidateFederationCache($queryHash: String) {
      federationCacheInvalidate(query_hash: $queryHash)
    }
    `,
    { queryHash: queryHash ?? null }
  );
  return result.federationCacheInvalidate;
}

/**
 * V44.0: 清除所有缓存
 *
 * @returns 是否成功
 */
export async function clearFederationCache(): Promise<boolean> {
  const result = await bffGraphQL<{ federationCacheClear: boolean }>(
    `
    mutation ClearFederationCache {
      federationCacheClear
    }
    `
  );
  return result.federationCacheClear;
}

/**
 * V44.0: 设置熔断器配置
 *
 * @param service 服务名
 * @param config 熔断器配置
 * @returns 是否成功
 */
export async function setFederationCircuitBreakerConfig(
  service: string,
  config: CircuitBreakerConfigInput
): Promise<boolean> {
  const result = await bffGraphQL<{ federationSetCircuitBreakerConfig: boolean }>(
    `
    mutation SetFederationCircuitBreakerConfig($service: String!, $config: CircuitBreakerConfigInput!) {
      federationSetCircuitBreakerConfig(service: $service, config: $config)
    }
    `,
    { service, config }
  );
  return result.federationSetCircuitBreakerConfig;
}

// ==================== V44.0 Track E: GraphQL 生产级监控 ====================

export type SpanType =
  | 'PARSE'
  | 'VALIDATE'
  | 'RESOLVE'
  | 'CACHE_CHECK'
  | 'DATA_FETCH'
  | 'EXTERNAL_CALL'
  | 'DB_QUERY'
  | 'TRANSFORM';

export type AlertLevel = 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';

export type AlertType =
  | 'HIGH_LATENCY'
  | 'HIGH_ERROR_RATE'
  | 'LOW_CACHE_HIT'
  | 'HIGH_QPS'
  | 'SUBSCRIPTION_ERROR'
  | 'SERVICE_DOWN'
  | 'SECURITY_BREACH';

export type MetricsWindow = 'ONE_MINUTE' | 'FIVE_MINUTES' | 'FIFTEEN_MINUTES' | 'ONE_HOUR';

export interface QuerySpan {
  span_id: string;
  parent_span_id: string | null;
  name: string;
  service: string;
  span_type: SpanType;
  start_time: string;
  end_time: string | null;
  duration_ms: number;
  attributes: Record<string, unknown>;
  status: string;
  error_message: string | null;
}

export interface QueryTrace {
  trace_id: string;
  query_hash: string | null;
  operation_name: string | null;
  start_time: string;
  end_time: string | null;
  duration_ms: number;
  status: string;
  spans: QuerySpan[];
  error_message: string | null;
  user_id: string | null;
  client_info: string | null;
}

export interface OperationMetric {
  operation_name: string;
  count: number;
  avg_duration_ms: number;
  p95_ms: number;
  error_count: number;
  cache_hit_rate: number;
}

export interface ServiceMetric {
  service_name: string;
  request_count: number;
  avg_latency_ms: number;
  error_count: number;
}

export interface GraphqlMetrics {
  qps: number;
  latency_p50_ms: number;
  latency_p95_ms: number;
  latency_p99_ms: number;
  error_rate: number;
  cache_hit_rate: number;
  total_queries: number;
  total_errors: number;
  total_cache_hits: number;
  total_cache_misses: number;
  active_subscriptions: number;
  ws_connections: number;
  by_operation: OperationMetric[];
  by_service: ServiceMetric[];
  window_start: string;
  window_end: string;
  window_size: string;
}

export interface GraphqlAlert {
  id: string;
  alert_type: AlertType;
  level: AlertLevel;
  message: string;
  value: number;
  threshold: number;
  started_at: string;
  acknowledged: boolean;
  resolved: boolean;
  resolved_at: string | null;
  labels: Record<string, unknown>;
}

export interface AlertRule {
  id: string;
  name: string;
  alert_type: AlertType;
  level: AlertLevel;
  threshold: number;
  duration_seconds: number;
  window_size: string;
  enabled: boolean;
  cooldown_seconds: number;
}

export interface AlertRuleInput {
  name: string;
  alert_type: AlertType;
  level: AlertLevel;
  threshold: number;
  duration_seconds: number;
  window_size: MetricsWindow;
  enabled: boolean;
  cooldown_seconds: number;
}

export interface MonitoringDashboardStats {
  total_queries: number;
  total_errors: number;
  total_traces: number;
  total_alerts: number;
  active_alerts: number;
  active_ws_connections: number;
  active_subscriptions: number;
  qps: number;
  error_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  cache_hit_rate: number;
  security_events_last_hour: number;
  federation_cache_hits: number;
  federation_cache_misses: number;
}

export interface QueryLatencyDistribution {
  buckets: number[];
  counts: number[];
  total_count: number;
}

export interface TopSlowQuery {
  query_hash: string | null;
  operation_name: string | null;
  avg_duration_ms: number;
  count: number;
  total_time_ms: number;
  max_duration_ms: number;
}

export interface ErrorRateTrend {
  timestamps: string[];
  error_rates: number[];
  total_requests: number[];
  error_counts: number[];
  interval_seconds: number;
}

/**
 * V44.0: 获取查询追踪列表
 */
export async function getGraphqlTraces(params?: {
  query_hash?: string;
  operation_name?: string;
  status?: string;
  limit?: number;
}): Promise<QueryTrace[]> {
  const result = await bffGraphQL<{ graphqlTraces: QueryTrace[] }>(
    `
    query GraphqlTraces($queryHash: String, $operationName: String, $status: String, $limit: Int) {
      graphqlTraces(query_hash: $queryHash, operation_name: $operationName, status: $status, limit: $limit) {
        trace_id
        query_hash
        operation_name
        start_time
        end_time
        duration_ms
        status
        error_message
        user_id
        client_info
        spans {
          span_id
          parent_span_id
          name
          service
          span_type
          start_time
          end_time
          duration_ms
          status
          error_message
        }
      }
    }
    `,
    params
  );
  return result.graphqlTraces;
}

/**
 * V44.0: 获取追踪详情
 */
export async function getGraphqlTrace(traceId: string): Promise<QueryTrace | null> {
  const result = await bffGraphQL<{ graphqlTrace: QueryTrace | null }>(
    `
    query GraphqlTrace($traceId: String!) {
      graphqlTrace(trace_id: $traceId) {
        trace_id
        query_hash
        operation_name
        start_time
        end_time
        duration_ms
        status
        error_message
        user_id
        client_info
        spans {
          span_id
          parent_span_id
          name
          service
          span_type
          start_time
          end_time
          duration_ms
          attributes
          status
          error_message
        }
      }
    }
    `,
    { traceId }
  );
  return result.graphqlTrace;
}

/**
 * V44.0: 获取实时指标
 */
export async function getGraphqlMetrics(window?: MetricsWindow): Promise<GraphqlMetrics> {
  const result = await bffGraphQL<{ graphqlMetrics: GraphqlMetrics }>(
    `
    query GraphqlMetrics($window: MetricsWindow) {
      graphqlMetrics(window: $window) {
        qps
        latency_p50_ms
        latency_p95_ms
        latency_p99_ms
        error_rate
        cache_hit_rate
        total_queries
        total_errors
        total_cache_hits
        total_cache_misses
        active_subscriptions
        ws_connections
        window_start
        window_end
        window_size
        by_operation {
          operation_name
          count
          avg_duration_ms
          p95_ms
          error_count
          cache_hit_rate
        }
        by_service {
          service_name
          request_count
          avg_latency_ms
          error_count
        }
      }
    }
    `,
    { window: window ?? 'FIVE_MINUTES' }
  );
  return result.graphqlMetrics;
}

/**
 * V44.0: 获取告警列表
 */
export async function getGraphqlAlerts(params?: {
  status?: string;
  level?: AlertLevel;
  limit?: number;
}): Promise<GraphqlAlert[]> {
  const result = await bffGraphQL<{ graphqlAlerts: GraphqlAlert[] }>(
    `
    query GraphqlAlerts($status: String, $level: AlertLevel, $limit: Int) {
      graphqlAlerts(status: $status, level: $level, limit: $limit) {
        id
        alert_type
        level
        message
        value
        threshold
        started_at
        acknowledged
        resolved
        resolved_at
        labels
      }
    }
    `,
    params
  );
  return result.graphqlAlerts;
}

/**
 * V44.0: 获取告警规则列表
 */
export async function getGraphqlAlertRules(): Promise<AlertRule[]> {
  const result = await bffGraphQL<{ graphqlAlertRules: AlertRule[] }>(
    `
    query GraphqlAlertRules {
      graphqlAlertRules {
        id
        name
        alert_type
        level
        threshold
        duration_seconds
        window_size
        enabled
        cooldown_seconds
      }
    }
    `
  );
  return result.graphqlAlertRules;
}

/**
 * V44.0: 获取监控仪表盘总览
 */
export async function getMonitoringDashboard(): Promise<MonitoringDashboardStats> {
  const result = await bffGraphQL<{ monitoringDashboard: MonitoringDashboardStats }>(
    `
    query MonitoringDashboard {
      monitoringDashboard {
        total_queries
        total_errors
        total_traces
        total_alerts
        active_alerts
        active_ws_connections
        active_subscriptions
        qps
        error_rate
        avg_latency_ms
        p95_latency_ms
        cache_hit_rate
        security_events_last_hour
        federation_cache_hits
        federation_cache_misses
      }
    }
    `
  );
  return result.monitoringDashboard;
}

/**
 * V44.0: 获取慢查询 Top N
 */
export async function getTopSlowQueries(params?: {
  limit?: number;
  window?: MetricsWindow;
}): Promise<TopSlowQuery[]> {
  const result = await bffGraphQL<{ topSlowQueries: TopSlowQuery[] }>(
    `
    query TopSlowQueries($limit: Int, $window: MetricsWindow) {
      topSlowQueries(limit: $limit, window: $window) {
        query_hash
        operation_name
        avg_duration_ms
        count
        total_time_ms
        max_duration_ms
      }
    }
    `,
    { limit: params?.limit, window: params?.window ?? 'FIFTEEN_MINUTES' }
  );
  return result.topSlowQueries;
}

/**
 * V44.0: 获取错误率趋势
 */
export async function getErrorRateTrend(params?: {
  window?: MetricsWindow;
  interval?: number;
}): Promise<ErrorRateTrend> {
  const result = await bffGraphQL<{ errorRateTrend: ErrorRateTrend }>(
    `
    query ErrorRateTrend($window: MetricsWindow, $interval: Int) {
      errorRateTrend(window: $window, interval: $interval) {
        timestamps
        error_rates
        total_requests
        error_counts
        interval_seconds
      }
    }
    `,
    { window: params?.window ?? 'ONE_HOUR', interval: params?.interval }
  );
  return result.errorRateTrend;
}

/**
 * V44.0: 获取查询延迟分布
 */
export async function getQueryLatencyDistribution(
  window?: MetricsWindow
): Promise<QueryLatencyDistribution> {
  const result = await bffGraphQL<{ queryLatencyDistribution: QueryLatencyDistribution }>(
    `
    query QueryLatencyDistribution($window: MetricsWindow) {
      queryLatencyDistribution(window: $window) {
        buckets
        counts
        total_count
      }
    }
    `,
    { window: window ?? 'FIFTEEN_MINUTES' }
  );
  return result.queryLatencyDistribution;
}

/**
 * V44.0: 添加告警规则
 */
export async function addAlertRule(input: AlertRuleInput): Promise<string> {
  const result = await bffGraphQL<{ addAlertRule: string }>(
    `
    mutation AddAlertRule($input: AlertRuleInput!) {
      addAlertRule(input: $input)
    }
    `,
    { input }
  );
  return result.addAlertRule;
}

/**
 * V44.0: 更新告警规则
 */
export async function updateAlertRule(id: string, input: AlertRuleInput): Promise<boolean> {
  const result = await bffGraphQL<{ updateAlertRule: boolean }>(
    `
    mutation UpdateAlertRule($id: String!, $input: AlertRuleInput!) {
      updateAlertRule(id: $id, input: $input)
    }
    `,
    { id, input }
  );
  return result.updateAlertRule;
}

/**
 * V44.0: 删除告警规则
 */
export async function deleteAlertRule(id: string): Promise<boolean> {
  const result = await bffGraphQL<{ deleteAlertRule: boolean }>(
    `
    mutation DeleteAlertRule($id: String!) {
      deleteAlertRule(id: $id)
    }
    `,
    { id }
  );
  return result.deleteAlertRule;
}

/**
 * V44.0: 确认告警
 */
export async function acknowledgeAlert(id: string): Promise<boolean> {
  const result = await bffGraphQL<{ acknowledgeAlert: boolean }>(
    `
    mutation AcknowledgeAlert($id: String!) {
      acknowledgeAlert(id: $id)
    }
    `,
    { id }
  );
  return result.acknowledgeAlert;
}

/**
 * V44.0: 解决告警
 */
export async function resolveAlert(id: string): Promise<boolean> {
  const result = await bffGraphQL<{ resolveAlert: boolean }>(
    `
    mutation ResolveAlert($id: String!) {
      resolveAlert(id: $id)
    }
    `,
    { id }
  );
  return result.resolveAlert;
}

/**
 * V44.0: 测试告警
 */
export async function testAlert(alertType: AlertType, level: AlertLevel): Promise<string> {
  const result = await bffGraphQL<{ testAlert: string }>(
    `
    mutation TestAlert($alertType: AlertType!, $level: AlertLevel!) {
      testAlert(alert_type: $alertType, level: $level)
    }
    `,
    { alertType, level }
  );
  return result.testAlert;
}

/**
 * V44.0: 重置指标
 */
export async function resetGraphqlMetrics(): Promise<boolean> {
  const result = await bffGraphQL<{ resetGraphqlMetrics: boolean }>(
    `
    mutation ResetGraphqlMetrics {
      resetGraphqlMetrics
    }
    `
  );
  return result.resetGraphqlMetrics;
}

// ==================== V45.0 Track B: GraphQL 边缘计算 + CDN 缓存 + 流式响应 ====================

/** V45.0: 边缘节点 */
export interface EdgeNode {
  id: string;
  region: string;
  location: string;
  latency_ms: number;
  health: boolean;
  capacity: number;
  current_load: number;
  functions_deployed: number;
}

/** V45.0: 边缘函数 */
export interface EdgeFunction {
  id: string;
  name: string;
  handler: string;
  route_pattern: string;
  cache_ttl_ms: number;
  deployed_to_regions: string[];
  version: string;
  enabled: boolean;
}

/** V45.0: 按区域统计 */
export interface EdgeNodeRegionStat {
  region: string;
  node_count: number;
  healthy_count: number;
  executions: number;
}

/** V45.0: 边缘计算统计 */
export interface EdgeComputeStats {
  total_nodes: number;
  healthy_nodes: number;
  total_functions: number;
  total_executions: number;
  avg_latency_ms: number;
  cache_hit_rate: number;
  by_region: EdgeNodeRegionStat[];
}

/** V45.0: CDN 缓存层 */
export interface CdnCacheLayer {
  layer_name: string;
  ttl_ms: number;
  max_entries: number;
  hit_rate: number;
  current_entries: number;
}

/** V45.0: CDN 缓存条目 */
export interface CdnCacheEntry {
  key: string;
  value: string;
  content_type: string;
  etag: string;
  created_at: string;
  expires_at: string;
  hit_count: number;
  size_bytes: number;
  tags: string[];
}

/** V45.0: CDN 按层统计 */
export interface CdnLayerStat {
  layer: string;
  entries: number;
  size_mb: number;
  hit_rate: number;
}

/** V45.0: CDN 统计 */
export interface CdnStats {
  total_entries: number;
  total_size_mb: number;
  hit_rate: number;
  miss_rate: number;
  eviction_count: number;
  warm_count: number;
  prefetch_count: number;
  by_layer: CdnLayerStat[];
}

/** V45.0: 流式配置 */
export interface StreamConfig {
  enabled: boolean;
  chunk_size: number;
  flush_interval_ms: number;
  max_buffer_size: number;
}

/** V45.0: 流式配置输入 */
export interface StreamConfigInput {
  enabled?: boolean;
  chunk_size?: number;
  flush_interval_ms?: number;
  max_buffer_size?: number;
}

/** V45.0: 延迟字段 */
export interface DeferredField {
  path: string;
  label?: string | null;
  depends_on: string[];
  estimated_delay_ms: number;
}

/** V45.0: 流式统计 */
export interface StreamStats {
  total_streams: number;
  active_streams: number;
  total_chunks: number;
  avg_chunks_per_stream: number;
  avg_stream_duration_ms: number;
}

/**
 * V45.0: 获取边缘节点列表
 */
export async function getEdgeNodes(): Promise<EdgeNode[]> {
  const result = await bffGraphQL<{ edgeNodes: EdgeNode[] }>(
    `
    query EdgeNodes {
      edgeNodes {
        id
        region
        location
        latency_ms
        health
        capacity
        current_load
        functions_deployed
      }
    }
    `
  );
  return result.edgeNodes;
}

/**
 * V45.0: 获取边缘函数列表
 */
export async function getEdgeFunctions(): Promise<EdgeFunction[]> {
  const result = await bffGraphQL<{ edgeFunctions: EdgeFunction[] }>(
    `
    query EdgeFunctions {
      edgeFunctions {
        id
        name
        handler
        route_pattern
        cache_ttl_ms
        deployed_to_regions
        version
        enabled
      }
    }
    `
  );
  return result.edgeFunctions;
}

/**
 * V45.0: 获取边缘计算统计
 */
export async function getEdgeComputeStats(): Promise<EdgeComputeStats> {
  const result = await bffGraphQL<{ edgeComputeStats: EdgeComputeStats }>(
    `
    query EdgeComputeStats {
      edgeComputeStats {
        total_nodes
        healthy_nodes
        total_functions
        total_executions
        avg_latency_ms
        cache_hit_rate
        by_region {
          region
          node_count
          healthy_count
          executions
        }
      }
    }
    `
  );
  return result.edgeComputeStats;
}

/**
 * V45.0: 获取 CDN 缓存统计
 */
export async function getCdnCacheStats(): Promise<CdnStats> {
  const result = await bffGraphQL<{ cdnCacheStats: CdnStats }>(
    `
    query CdnCacheStats {
      cdnCacheStats {
        total_entries
        total_size_mb
        hit_rate
        miss_rate
        eviction_count
        warm_count
        prefetch_count
        by_layer {
          layer
          entries
          size_mb
          hit_rate
        }
      }
    }
    `
  );
  return result.cdnCacheStats;
}

/**
 * V45.0: 获取 CDN 缓存条目列表
 * @param tags 可选标签过滤
 * @param limit 返回数量限制
 */
export async function getCdnCacheEntries(
  tags?: string[],
  limit?: number
): Promise<CdnCacheEntry[]> {
  const result = await bffGraphQL<{ cdnCacheEntries: CdnCacheEntry[] }>(
    `
    query CdnCacheEntries($tags: [String!], $limit: Int) {
      cdnCacheEntries(tags: $tags, limit: $limit) {
        key
        value
        content_type
        etag
        created_at
        expires_at
        hit_count
        size_bytes
        tags
      }
    }
    `,
    { tags, limit }
  );
  return result.cdnCacheEntries;
}

/**
 * V45.0: 获取流式响应统计
 */
export async function getStreamStats(): Promise<StreamStats> {
  const result = await bffGraphQL<{ streamStats: StreamStats }>(
    `
    query StreamStats {
      streamStats {
        total_streams
        active_streams
        total_chunks
        avg_chunks_per_stream
        avg_stream_duration_ms
      }
    }
    `
  );
  return result.streamStats;
}

/**
 * V45.0: 获取流式配置
 */
export async function getStreamConfig(): Promise<StreamConfig> {
  const result = await bffGraphQL<{ streamConfig: StreamConfig }>(
    `
    query StreamConfig {
      streamConfig {
        enabled
        chunk_size
        flush_interval_ms
        max_buffer_size
      }
    }
    `
  );
  return result.streamConfig;
}

/**
 * V45.0: 获取延迟字段列表
 * @param queryHash 可选查询哈希过滤
 */
export async function getDeferredFields(queryHash?: string): Promise<DeferredField[]> {
  const result = await bffGraphQL<{ deferredFields: DeferredField[] }>(
    `
    query DeferredFields($queryHash: String) {
      deferredFields(query_hash: $queryHash) {
        path
        label
        depends_on
        estimated_delay_ms
      }
    }
    `,
    { queryHash }
  );
  return result.deferredFields;
}

/**
 * V45.0: 部署边缘函数
 * @param name 函数名称
 * @param handler 处理器
 * @param routePattern 路由模式
 * @param cacheTtlMs 缓存 TTL（毫秒）
 * @returns 函数 ID
 */
export async function deployEdgeFunction(
  name: string,
  handler: string,
  routePattern: string,
  cacheTtlMs: number
): Promise<string> {
  const result = await bffGraphQL<{ deployEdgeFunction: string }>(
    `
    mutation DeployEdgeFunction($name: String!, $handler: String!, $routePattern: String!, $cacheTtlMs: Long!) {
      deployEdgeFunction(name: $name, handler: $handler, route_pattern: $routePattern, cache_ttl_ms: $cacheTtlMs)
    }
    `,
    { name, handler, routePattern, cacheTtlMs }
  );
  return result.deployEdgeFunction;
}

/**
 * V45.0: 在边缘节点执行函数
 * @param functionName 函数名称
 * @param input 输入数据
 * @param region 可选区域
 * @returns 执行结果
 */
export async function executeAtEdge(
  functionName: string,
  input: Record<string, unknown>,
  region?: string
): Promise<unknown> {
  const result = await bffGraphQL<{ executeAtEdge: unknown }>(
    `
    mutation ExecuteAtEdge($functionName: String!, $input: JSON!, $region: String) {
      executeAtEdge(function_name: $functionName, input: $input, region: $region)
    }
    `,
    { functionName, input, region }
  );
  return result.executeAtEdge;
}

/**
 * V45.0: CDN 缓存预热
 * @param queryHashes 查询哈希列表
 * @returns 预热的条目数
 */
export async function cdnCacheWarm(queryHashes: string[]): Promise<number> {
  const result = await bffGraphQL<{ cdnCacheWarm: number }>(
    `
    mutation CdnCacheWarm($queryHashes: [String!]!) {
      cdnCacheWarm(query_hashes: $queryHashes)
    }
    `,
    { queryHashes }
  );
  return result.cdnCacheWarm;
}

/**
 * V45.0: CDN 缓存预取
 * @param queryHashes 查询哈希列表
 * @returns 预取的条目数
 */
export async function cdnCachePrefetch(queryHashes: string[]): Promise<number> {
  const result = await bffGraphQL<{ cdnCachePrefetch: number }>(
    `
    mutation CdnCachePrefetch($queryHashes: [String!]!) {
      cdnCachePrefetch(query_hashes: $queryHashes)
    }
    `,
    { queryHashes }
  );
  return result.cdnCachePrefetch;
}

/**
 * V45.0: 按标签失效 CDN 缓存
 * @param tags 标签列表
 * @returns 失效的条目数
 */
export async function cdnCacheInvalidateByTag(tags: string[]): Promise<number> {
  const result = await bffGraphQL<{ cdnCacheInvalidateByTag: number }>(
    `
    mutation CdnCacheInvalidateByTag($tags: [String!]!) {
      cdnCacheInvalidateByTag(tags: $tags)
    }
    `,
    { tags }
  );
  return result.cdnCacheInvalidateByTag;
}

/**
 * V45.0: 清空所有 CDN 缓存
 */
export async function cdnCachePurgeAll(): Promise<boolean> {
  const result = await bffGraphQL<{ cdnCachePurgeAll: boolean }>(
    `
    mutation CdnCachePurgeAll {
      cdnCachePurgeAll
    }
    `
  );
  return result.cdnCachePurgeAll;
}

/**
 * V45.0: 更新流式配置
 * @param config 流式配置输入
 */
export async function updateStreamConfig(config: StreamConfigInput): Promise<boolean> {
  const result = await bffGraphQL<{ updateStreamConfig: boolean }>(
    `
    mutation UpdateStreamConfig($config: StreamConfigInput!) {
      updateStreamConfig(config: $config)
    }
    `,
    { config }
  );
  return result.updateStreamConfig;
}

// ==================== V45.0 Track E: GraphQL 企业级治理 ====================

/** V45.0: Schema 版本状态 */
export type SchemaVersionStatus =
  | 'DRAFT'
  | 'STAGING'
  | 'ACTIVE'
  | 'DEPRECATED'
  | 'RETIRED';

/** V45.0: Schema 变更类型 */
export type SchemaChangeType =
  | 'TYPE_ADDED'
  | 'TYPE_REMOVED'
  | 'FIELD_ADDED'
  | 'FIELD_REMOVED'
  | 'FIELD_CHANGED'
  | 'ENUM_VALUE_ADDED'
  | 'ENUM_VALUE_REMOVED'
  | 'ARGUMENT_ADDED'
  | 'ARGUMENT_REMOVED'
  | 'INTERFACE_ADDED'
  | 'INTERFACE_REMOVED';

/** V45.0: 契约违规类型 */
export type ViolationType =
  | 'MISSING_FIELD'
  | 'EXTRA_FIELD'
  | 'TYPE_MISMATCH'
  | 'NULLABILITY_CHANGED'
  | 'DEPRECATION_VIOLATION';

/** V45.0: Schema 变更记录 */
export interface SchemaChange {
  version: string;
  changeType: SchemaChangeType;
  description: string;
  breaking: boolean;
  affectedTypes: string[];
  timestamp: string;
}

/** V45.0: Schema 注册表条目 */
export interface SchemaRegistryEntry {
  serviceName: string;
  version: string;
  sdl: string;
  schemaHash: string;
  registeredAt: string;
  registeredBy: string;
  status: SchemaVersionStatus;
  changes: SchemaChange[];
  dependencies: string[];
}

/** V45.0: 契约违规 */
export interface ContractViolation {
  fieldPath: string;
  expected: string;
  actual: string;
  violationType: ViolationType;
  severity: string;
}

/** V45.0: 契约测试结果 */
export interface ContractTestResult {
  testId: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  responseTimeMs: number;
  ranAt: string;
  diff: ContractViolation[];
}

/** V45.0: 契约测试定义 */
export interface ContractTest {
  id: string;
  name: string;
  service: string;
  operationType: string;
  query: string;
  expectedFields: string[];
  expectedTypes: string[];
  tolerance: number;
  enabled: boolean;
  lastRun: string | null;
  lastResult: ContractTestResult | null;
}

/** V45.0: 契约测试输入 */
export interface ContractTestInput {
  name: string;
  service: string;
  operationType: string;
  query: string;
  expectedFields: string[];
  expectedTypes: string[];
  tolerance?: number;
  enabled?: boolean;
}

/** V45.0: 版本变更日志 */
export interface VersionChangelog {
  version: string;
  changes: SchemaChange[];
  breakingChangesCount: number;
  additionsCount: number;
  deprecationsCount: number;
  improvementsCount: number;
}

/** V45.0: Schema 版本 */
export interface SchemaVersion {
  service: string;
  version: string;
  semver: string;
  sdl: string;
  hash: string;
  changelog: VersionChangelog;
  publishedAt: string;
  author: string;
  status: SchemaVersionStatus;
  downloadCount: number;
  tags: string[];
}

/** V45.0: 版本差异 */
export interface VersionDiff {
  fromVersion: string;
  toVersion: string;
  addedTypes: string[];
  removedTypes: string[];
  modifiedTypes: string[];
  addedFields: string[];
  removedFields: string[];
  breakingChanges: SchemaChange[];
  compatible: boolean;
}

/** V45.0: 治理统计 */
export interface SchemaGovernanceStats {
  totalServices: number;
  totalVersions: number;
  activeSchemas: number;
  totalTests: number;
  passingTests: number;
  failingTests: number;
  breakingChangesDetected: number;
  lastScan: string;
}

/** V45.0: 服务治理信息 */
export interface ServiceGovernanceInfo {
  service: string;
  currentVersion: string;
  versionsCount: number;
  testsCount: number;
  passingRate: number;
  lastChange: string;
  breakingChangesCount: number;
}

// --- V45.0 Track E: 查询函数 ---

/**
 * V45.0: 获取 Schema 注册表（指定服务的所有已注册版本）
 * @param service 服务名称
 */
export async function getSchemaRegistry(service: string): Promise<SchemaRegistryEntry[]> {
  const result = await bffGraphQL<{ schemaRegistry: SchemaRegistryEntry[] }>(
    `
    query SchemaRegistry($service: String!) {
      schemaRegistry(service: $service) {
        serviceName
        version
        sdl
        schemaHash
        registeredAt
        registeredBy
        status
        changes {
          version
          changeType
          description
          breaking
          affectedTypes
          timestamp
        }
        dependencies
      }
    }
    `,
    { service }
  );
  return result.schemaRegistry;
}

/**
 * V45.0: 获取 Schema 版本列表（版本管理器中的版本列表）
 * @param service 服务名称
 */
export async function getSchemaVersions(service: string): Promise<SchemaVersion[]> {
  const result = await bffGraphQL<{ schemaVersions: SchemaVersion[] }>(
    `
    query SchemaVersions($service: String!) {
      schemaVersions(service: $service) {
        service
        version
        semver
        sdl
        hash
        changelog {
          version
          changes {
            version
            changeType
            description
            breaking
            affectedTypes
            timestamp
          }
          breakingChangesCount
          additionsCount
          deprecationsCount
          improvementsCount
        }
        publishedAt
        author
        status
        downloadCount
        tags
      }
    }
    `,
    { service }
  );
  return result.schemaVersions;
}

/**
 * V45.0: 获取 Schema 版本详情
 * @param service 服务名称
 * @param version 版本号
 */
export async function getSchemaVersionDetail(
  service: string,
  version: string
): Promise<SchemaVersion | null> {
  const result = await bffGraphQL<{ schemaVersionDetail: SchemaVersion | null }>(
    `
    query SchemaVersionDetail($service: String!, $version: String!) {
      schemaVersionDetail(service: $service, version: $version) {
        service
        version
        semver
        sdl
        hash
        changelog {
          version
          changes {
            version
            changeType
            description
            breaking
            affectedTypes
            timestamp
          }
          breakingChangesCount
          additionsCount
          deprecationsCount
          improvementsCount
        }
        publishedAt
        author
        status
        downloadCount
        tags
      }
    }
    `,
    { service, version }
  );
  return result.schemaVersionDetail;
}

/**
 * V45.0: 获取版本差异
 * @param service 服务名称
 * @param fromVersion 起始版本
 * @param toVersion 目标版本
 */
export async function getSchemaDiff(
  service: string,
  fromVersion: string,
  toVersion: string
): Promise<VersionDiff | null> {
  const result = await bffGraphQL<{ schemaDiff: VersionDiff | null }>(
    `
    query SchemaDiff($service: String!, $fromVersion: String!, $toVersion: String!) {
      schemaDiff(service: $service, fromVersion: $fromVersion, toVersion: $toVersion) {
        fromVersion
        toVersion
        addedTypes
        removedTypes
        modifiedTypes
        addedFields
        removedFields
        breakingChanges {
          version
          changeType
          description
          breaking
          affectedTypes
          timestamp
        }
        compatible
      }
    }
    `,
    { service, fromVersion, toVersion }
  );
  return result.schemaDiff;
}

/**
 * V45.0: 获取契约测试列表（service 为空时返回全部）
 * @param service 服务名称（空字符串表示全部）
 */
export async function getContractTests(service = ''): Promise<ContractTest[]> {
  const result = await bffGraphQL<{ contractTests: ContractTest[] }>(
    `
    query ContractTests($service: String!) {
      contractTests(service: $service) {
        id
        name
        service
        operationType
        query
        expectedFields
        expectedTypes
        tolerance
        enabled
        lastRun
        lastResult {
          testId
          passed
          errors
          warnings
          responseTimeMs
          ranAt
          diff {
            fieldPath
            expected
            actual
            violationType
            severity
          }
        }
      }
    }
    `,
    { service }
  );
  return result.contractTests;
}

/**
 * V45.0: 获取契约测试结果
 * @param testId 测试 ID
 * @param limit 返回条数上限
 */
export async function getContractTestResults(
  testId: string,
  limit = 50
): Promise<ContractTestResult[]> {
  const result = await bffGraphQL<{ contractTestResults: ContractTestResult[] }>(
    `
    query ContractTestResults($testId: String!, $limit: Int) {
      contractTestResults(testId: $testId, limit: $limit) {
        testId
        passed
        errors
        warnings
        responseTimeMs
        ranAt
        diff {
          fieldPath
          expected
          actual
          violationType
          severity
        }
      }
    }
    `,
    { testId, limit }
  );
  return result.contractTestResults;
}

/**
 * V45.0: 检测 Breaking Change（对比两个版本之间的 Breaking Change）
 * @param service 服务名称
 * @param fromVersion 起始版本
 * @param toVersion 目标版本
 */
export async function getBreakingChanges(
  service: string,
  fromVersion: string,
  toVersion: string
): Promise<SchemaChange[]> {
  const result = await bffGraphQL<{ breakingChanges: SchemaChange[] }>(
    `
    query BreakingChanges($service: String!, $fromVersion: String!, $toVersion: String!) {
      breakingChanges(service: $service, fromVersion: $fromVersion, toVersion: $toVersion) {
        version
        changeType
        description
        breaking
        affectedTypes
        timestamp
      }
    }
    `,
    { service, fromVersion, toVersion }
  );
  return result.breakingChanges;
}

/**
 * V45.0: 获取治理统计
 */
export async function getSchemaGovernanceStats(): Promise<SchemaGovernanceStats> {
  const result = await bffGraphQL<{ schemaGovernanceStats: SchemaGovernanceStats }>(
    `
    query SchemaGovernanceStats {
      schemaGovernanceStats {
        totalServices
        totalVersions
        activeSchemas
        totalTests
        passingTests
        failingTests
        breakingChangesDetected
        lastScan
      }
    }
    `
  );
  return result.schemaGovernanceStats;
}

/**
 * V45.0: 获取各服务治理信息
 */
export async function getServiceGovernanceInfo(): Promise<ServiceGovernanceInfo[]> {
  const result = await bffGraphQL<{ serviceGovernanceInfo: ServiceGovernanceInfo[] }>(
    `
    query ServiceGovernanceInfo {
      serviceGovernanceInfo {
        service
        currentVersion
        versionsCount
        testsCount
        passingRate
        lastChange
        breakingChangesCount
      }
    }
    `
  );
  return result.serviceGovernanceInfo;
}

// --- V45.0 Track E: 变更函数 ---

/**
 * V45.0: 注册 Schema（同时发布到版本管理器）
 * @param service 服务名称
 * @param version 版本号
 * @param sdl SDL 文本
 * @returns 注册后的版本号
 */
export async function registerSchema(
  service: string,
  version: string,
  sdl: string
): Promise<string> {
  const result = await bffGraphQL<{ registerSchema: string }>(
    `
    mutation RegisterSchema($service: String!, $version: String!, $sdl: String!) {
      registerSchema(service: $service, version: $version, sdl: $sdl)
    }
    `,
    { service, version, sdl }
  );
  return result.registerSchema;
}

/**
 * V45.0: 废弃 Schema 版本
 * @param service 服务名称
 * @param version 版本号
 */
export async function deprecateSchemaVersion(
  service: string,
  version: string
): Promise<boolean> {
  const result = await bffGraphQL<{ deprecateSchemaVersion: boolean }>(
    `
    mutation DeprecateSchemaVersion($service: String!, $version: String!) {
      deprecateSchemaVersion(service: $service, version: $version)
    }
    `,
    { service, version }
  );
  return result.deprecateSchemaVersion;
}

/**
 * V45.0: 退役 Schema 版本
 * @param service 服务名称
 * @param version 版本号
 */
export async function retireSchemaVersion(
  service: string,
  version: string
): Promise<boolean> {
  const result = await bffGraphQL<{ retireSchemaVersion: boolean }>(
    `
    mutation RetireSchemaVersion($service: String!, $version: String!) {
      retireSchemaVersion(service: $service, version: $version)
    }
    `,
    { service, version }
  );
  return result.retireSchemaVersion;
}

/**
 * V45.0: 添加契约测试
 * @param input 契约测试输入
 * @returns 新建测试的 ID
 */
export async function addContractTest(input: ContractTestInput): Promise<string> {
  const result = await bffGraphQL<{ addContractTest: string }>(
    `
    mutation AddContractTest($input: ContractTestInput!) {
      addContractTest(input: $input)
    }
    `,
    { input }
  );
  return result.addContractTest;
}

/**
 * V45.0: 更新契约测试
 * @param id 测试 ID
 * @param input 契约测试输入
 */
export async function updateContractTest(
  id: string,
  input: ContractTestInput
): Promise<boolean> {
  const result = await bffGraphQL<{ updateContractTest: boolean }>(
    `
    mutation UpdateContractTest($id: String!, $input: ContractTestInput!) {
      updateContractTest(id: $id, input: $input)
    }
    `,
    { id, input }
  );
  return result.updateContractTest;
}

/**
 * V45.0: 删除契约测试
 * @param id 测试 ID
 */
export async function deleteContractTest(id: string): Promise<boolean> {
  const result = await bffGraphQL<{ deleteContractTest: boolean }>(
    `
    mutation DeleteContractTest($id: String!) {
      deleteContractTest(id: $id)
    }
    `,
    { id }
  );
  return result.deleteContractTest;
}

/**
 * V45.0: 运行单个契约测试
 * @param id 测试 ID
 * @returns 测试结果
 */
export async function runContractTest(id: string): Promise<ContractTestResult> {
  const result = await bffGraphQL<{ runContractTest: ContractTestResult }>(
    `
    mutation RunContractTest($id: String!) {
      runContractTest(id: $id) {
        testId
        passed
        errors
        warnings
        responseTimeMs
        ranAt
        diff {
          fieldPath
          expected
          actual
          violationType
          severity
        }
      }
    }
    `,
    { id }
  );
  return result.runContractTest;
}

/**
 * V45.0: 运行全部契约测试
 * @param service 可选服务名称筛选
 * @returns 运行的测试数量
 */
export async function runAllContractTests(service?: string): Promise<number> {
  const result = await bffGraphQL<{ runAllContractTests: number }>(
    `
    mutation RunAllContractTests($service: String) {
      runAllContractTests(service: $service)
    }
    `,
    { service: service ?? null }
  );
  return result.runAllContractTests;
}

/**
 * V45.0: 发布 Schema 版本（从注册表获取 SDL 并发布到版本管理器）
 * @param service 服务名称
 * @param version 版本号
 * @param changelog 变更日志
 * @returns 发布后的版本号
 */
export async function publishSchemaVersion(
  service: string,
  version: string,
  changelog: string
): Promise<string> {
  const result = await bffGraphQL<{ publishSchemaVersion: string }>(
    `
    mutation PublishSchemaVersion($service: String!, $version: String!, $changelog: String!) {
      publishSchemaVersion(service: $service, version: $version, changelog: $changelog)
    }
    `,
    { service, version, changelog }
  );
  return result.publishSchemaVersion;
}

/**
 * V45.0: 提升 Schema 版本为 Active
 * @param service 服务名称
 * @param version 版本号
 */
export async function promoteSchemaVersion(
  service: string,
  version: string
): Promise<boolean> {
  const result = await bffGraphQL<{ promoteSchemaVersion: boolean }>(
    `
    mutation PromoteSchemaVersion($service: String!, $version: String!) {
      promoteSchemaVersion(service: $service, version: $version)
    }
    `,
    { service, version }
  );
  return result.promoteSchemaVersion;
}

/**
 * V45.0: 回滚 Schema 到指定版本
 * @param service 服务名称
 * @param toVersion 目标版本
 */
export async function rollbackSchema(
  service: string,
  toVersion: string
): Promise<boolean> {
  const result = await bffGraphQL<{ rollbackSchema: boolean }>(
    `
    mutation RollbackSchema($service: String!, $toVersion: String!) {
      rollbackSchema(service: $service, toVersion: $toVersion)
    }
    `,
    { service, toVersion }
  );
  return result.rollbackSchema;
}
