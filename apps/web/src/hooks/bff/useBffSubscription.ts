/**
 * V39.0 Track D: 通用 BFF GraphQL Subscription hook
 *
 * 基于 WebSocket（graphql-transport-ws 协议）封装通用订阅能力，
 * 支持任意 GraphQL Subscription 查询 + 变量 + 过滤条件。
 *
 * 特性：
 * - 指数退避自动重连（初始 1s，最大 30s）
 * - 连接状态实时反馈（connecting / connected / disconnected / reconnecting）
 * - 订阅消息过滤（filter 谓词，仅传递符合条件的消息）
 * - 卸载时自动清理 WebSocket 连接
 *
 * @example
 * ```tsx
 * const { connected, error } = useBffSubscription<{
 *   service: string;
 *   healthy: boolean;
 * }>(
 *   `subscription ServiceHealthChanged {
 *     serviceHealthChanged { service healthy url }
 *   }`,
 *   {},
 *   (data) => console.log('health changed:', data),
 *   { filter: (data) => data.service === 'erp' }
 * );
 * ```
 */

import { useEffect, useRef, useState } from 'react';

/** 订阅连接状态 */
export type SubscriptionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/** useBffSubscription 配置项 */
export interface UseBffSubscriptionOptions<T> {
  /**
   * 消息过滤谓词：仅当返回 true 时才调用 onMessage。
   * 用于在客户端对订阅消息做二次过滤。
   */
  filter?: (data: T) => boolean;
  /** 连接状态变化回调 */
  onStatusChange?: (status: SubscriptionStatus) => void;
  /** 初始重连延迟（毫秒），默认 1000 */
  initialReconnectDelay?: number;
  /** 最大重连延迟（毫秒），默认 30000 */
  maxReconnectDelay?: number;
}

/** useBffSubscription 返回值 */
export interface UseBffSubscriptionResult {
  /** 当前连接状态 */
  connected: boolean;
  /** 完整连接状态 */
  status: SubscriptionStatus;
  /** 错误信息（连接或订阅层面） */
  error: string | null;
}

/**
 * 通用 BFF GraphQL Subscription hook
 *
 * @param query GraphQL Subscription 查询字符串
 * @param variables 订阅变量
 * @param onMessage 消息回调
 * @param options 额外配置（过滤、重连策略等）
 */
export function useBffSubscription<T>(
  query: string,
  variables: Record<string, unknown>,
  onMessage: (data: T) => void,
  options?: UseBffSubscriptionOptions<T>
): UseBffSubscriptionResult {
  const {
    filter,
    onStatusChange,
    initialReconnectDelay = 1000,
    maxReconnectDelay = 30000,
  } = options ?? {};

  const [status, setStatus] = useState<SubscriptionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  // 用 ref 持有最新的回调，避免 effect 频繁重建 WebSocket
  const onMessageRef = useRef(onMessage);
  const filterRef = useRef(filter);
  const onStatusChangeRef = useRef(onStatusChange);

  onMessageRef.current = onMessage;
  filterRef.current = filter;
  onStatusChangeRef.current = onStatusChange;

  // 生成唯一订阅 ID（用于 WebSocket 消息路由）
  const subIdRef = useRef<string>(
    `bff-sub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  useEffect(() => {
    // V64 静默降级：开发环境下 portal 服务（8063）通常未启动，
    // 跳过 WebSocket 连接避免 Firefox "无法建立连接" 刷屏。
    // 如需在开发环境启用 BFF WebSocket，设置 VITE_BFF_WS_ENABLED=true
    if (import.meta.env.DEV && !import.meta.env.VITE_BFF_WS_ENABLED) {
      setStatus('disconnected');
      return;
    }

    const wsUrl = `ws://${window.location.host}/api/portal/graphql/ws`;
    let ws: WebSocket | null = null;
    let closed = false;
    let reconnectDelay = initialReconnectDelay;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const updateStatus = (newStatus: SubscriptionStatus) => {
      setStatus(newStatus);
      onStatusChangeRef.current?.(newStatus);
    };

    const connect = () => {
      if (closed) return;

      updateStatus(reconnectDelay > initialReconnectDelay ? 'reconnecting' : 'connecting');

      try {
        ws = new WebSocket(wsUrl, ['graphql-transport-ws']);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'WebSocket 创建失败');
        updateStatus('disconnected');
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        reconnectDelay = initialReconnectDelay;
        setError(null);
        updateStatus('connected');
        ws?.send(JSON.stringify({ type: 'connection_init', payload: {} }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);

          if (msg.type === 'connection_ack') {
            // 发起订阅
            ws?.send(
              JSON.stringify({
                id: subIdRef.current,
                type: 'subscribe',
                payload: { query, variables },
              })
            );
          } else if (msg.type === 'next' && msg.payload?.data) {
            // 提取订阅数据：payload.data 是 { <fieldName>: T } 结构
            const dataPayload = msg.payload.data as Record<string, unknown>;
            // 取第一个字段的值作为消息体
            const dataValue = Object.values(dataPayload)[0] as T;
            // 应用客户端过滤
            const shouldDeliver =
              dataValue !== undefined && (!filterRef.current || filterRef.current(dataValue));
            if (shouldDeliver) {
              onMessageRef.current(dataValue);
            }
          } else if (msg.type === 'error') {
            const errMsg = msg.payload?.message ?? '订阅错误';
            setError(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
          }
        } catch {
          // 忽略 JSON 解析错误
        }
      };

      ws.onclose = () => {
        if (closed) {
          updateStatus('disconnected');
          return;
        }
        updateStatus('reconnecting');
        scheduleReconnect();
      };

      ws.onerror = () => {
        // onerror 后通常会触发 onclose，重连逻辑在 onclose 中处理
      };
    };

    const scheduleReconnect = () => {
      if (closed) return;
      reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay);
      reconnectTimer = setTimeout(connect, reconnectDelay);
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      // 主动发送 complete 停止订阅
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ id: subIdRef.current, type: 'complete' }));
        } catch {
          // ignore
        }
      }
      ws?.close();
      updateStatus('disconnected');
    };
  }, [query, JSON.stringify(variables), initialReconnectDelay, maxReconnectDelay]);

  return {
    connected: status === 'connected',
    status,
    error,
  };
}

export default useBffSubscription;
