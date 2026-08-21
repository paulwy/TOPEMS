/**
 * Portal BFF 聚合 API 客户端
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
import { logger } from '@/utils/logger';
import i18n from '@/i18n';

const perfLogger = logger.child({ prefix: 'BFF-GraphQL' });

// ==================== 性能监控回调注册 ====================

type PerformanceCallback = (
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
function onBffPerformance(callback: PerformanceCallback): () => void {
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
      perfLogger.error(i18n.t('shared.index.k0'), e);
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

interface BusinessStatsAggregation {
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
  // V64: GraphQL schema 用驼峰 createdAt（后端 UnifiedTodoGql 字段），
  // TS 接口保留 created_at 兼容旧代码消费方，两者二选一存在皆可
  createdAt?: string;
  created_at?: string;
}

export const bffApi = {
  /** 获取跨服务业务统计数据（REST） */
  getBusinessStats: () =>
    portal.get<ApiResponse<BusinessStatsAggregation>>('/dashboard/business-stats'),

  /** 获取统一待办列表（REST） */
  getUnifiedTodos: () => portal.get<ApiResponse<UnifiedTodo[]>>('/dashboard/unified-todos'),
};

// ==================== GraphQL 查询 API ====================

// Apollo 持久化查询（APQ）— 查询哈希缓存
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

// V64 mock fallback：开发环境 + portal 服务未启动时，bffGraphQL 直接返回空结构，
// 避免 Dashboard 整页出现错误状态。生产环境 / 显式设置 VITE_BFF_MOCK=false 时关闭。
function shouldMockBff(): boolean {
  return Boolean(import.meta.env.DEV && import.meta.env.VITE_BFF_MOCK !== 'false');
}

function buildMockForQuery<T>(query: string): T | null {
  const q = query.trim();
  // Dashboard 复合查询：返回空 stats/todos/services 结构
  if (/query\s+Dashboard\b/i.test(q)) {
    return {
      dashboard: {
        stats: {
          erp: { service: 'erp', total: 0, active: 0, available: false },
          crm: { service: 'crm', total: 0, active: 0, available: false },
          hrm: { service: 'hrm', total: 0, active: 0, available: false },
          finance: { service: 'finance', total: 0, active: 0, available: false },
          mes: { service: 'mes', total: 0, active: 0, available: false },
          workflow: { service: 'workflow', total: 0, active: 0, available: false },
        },
        todos: [],
        services: [],
      },
    } as unknown as T;
  }
  if (/query\s+BusinessStats\b/i.test(q)) {
    return {
      businessStats: {
        erp: { service: 'erp', total: 0, active: 0, available: false },
        crm: { service: 'crm', total: 0, active: 0, available: false },
        hrm: { service: 'hrm', total: 0, active: 0, available: false },
        finance: { service: 'finance', total: 0, active: 0, available: false },
        mes: { service: 'mes', total: 0, active: 0, available: false },
        workflow: { service: 'workflow', total: 0, active: 0, available: false },
      },
    } as unknown as T;
  }
  if (/query\s+UnifiedTodos\b/i.test(q)) {
    return { unifiedTodos: [] } as unknown as T;
  }
  if (/mutation\s+CompleteTodo\b/i.test(q)) {
    return {
      completeTodo: { id: '', title: '', source: 'workflow', priority: 0, status: 'done' },
    } as unknown as T;
  }
  // 通用：根据查询名自动生成空结构（避免抛错破坏页面渲染）
  const queryMatch = q.match(/^(query|mutation|subscription)\s+(\w+)/i);
  if (queryMatch) {
    const opName = queryMatch[2];
    return { [opName.charAt(0).toLowerCase() + opName.slice(1)]: null } as unknown as T;
  }
  return null;
}

/**
 * 执行 GraphQL 请求（带 APQ 持久化查询支持）
 *
 * 使用 Apollo Persisted Queries 协议:
 * - 首次请求：发送查询哈希，若后端未缓存则回退到完整查询
 * - 后续请求：仅发送哈希，减少请求体积
 */
async function executeGraphQL<T>(body: Record<string, unknown>): Promise<T> {
  // V64 早返回：开发环境 mock 模式直接返回空结构，不发送请求
  if (shouldMockBff()) {
    const queryStr = typeof body.query === 'string' ? body.query : '';
    const mock = buildMockForQuery<T>(queryStr);
    if (mock) {
      perfLogger.warn('BFF mock: return stub for query', {
        name: parseQueryName(queryStr),
      });
      return mock;
    }
    // 未匹配到 mock 规则：先尝试真正的请求（portal 已启动时正常使用），失败再回落空结构
    try {
      const response = await fetch('/api/portal/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const json = await response.json();
        if (!json.errors?.length) return json.data as T;
      }
    } catch {
      // fall-through to warn + empty
    }
    perfLogger.warn('BFF mock fallback: no rule matched and portal unreachable; returning empty', {
      name: parseQueryName(typeof body.query === 'string' ? body.query : ''),
    });
    return null as unknown as T;
  }

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
 * 执行 GraphQL 查询（自动启用 APQ 持久化查询）
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
      `${i18n.t('shared.index.graphql_1')}${operationName} - ${finalDuration.toFixed(0)}ms - ${success ? i18n.t('api.index.k0') : i18n.t('api.index.k2')} - ${cached ? '缓存命中' : '缓存未命中'}`
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
        todos { id title source priority status createdAt }
        services { service healthy url }
      }
    }
  `);
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

// ==================== GraphQL Subscription ====================

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
  // V64 静默降级：开发环境下 portal 服务（8063）通常未启动，
  // 跳过 WebSocket 连接避免浏览器控制台刷屏。
  if (import.meta.env.DEV && !import.meta.env.VITE_BFF_WS_ENABLED) {
    return () => {}; // no-op
  }

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
        {
          i18n.t('api.index.k0');
        }
      }
    };
  };

  connect();

  return () => {
    closed = true;
    ws?.close();
  };
}

// ==================== 主数据引用 API ====================

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
};
