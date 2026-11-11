import { useEffect, useCallback, useRef, useState } from 'react';
import { logger } from '@/utils/logger';
import {
  calculateBackoffDelay,
  HeartbeatMonitor,
  getNextReconnectDelay,
  DEFAULT_RECONNECT_STRATEGY,
} from '@/utils/websocketOptimizer';

// 签名密钥源与后端 unified-core ws.rs 验签统一：后端以 jwt_secret 为 HMAC-SHA256 key
// （lib/shared-auth::sign_message）。前端必须通过 VITE_WS_SIGNING_SECRET 注入与后端
// 相同的密钥值；缺失时按后端策略降级——不携带签名（后端对未签消息仅 warn 不拒绝），
// 绝不使用硬编码默认值：硬编码默认与生产 jwt_secret 不一致会导致验签失败/签名告警。
const WS_SIGNING_SECRET: string = import.meta.env.VITE_WS_SIGNING_SECRET ?? '';

if (!WS_SIGNING_SECRET) {
  logger.warn(
    '[WebSocket] VITE_WS_SIGNING_SECRET 未配置：WS 消息将不携带签名（须与后端 jwt_secret 一致方可通过验签）'
  );
}

async function generateSignature(message: string): Promise<string> {
  if (!WS_SIGNING_SECRET) return '';
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(WS_SIGNING_SECRET);
  const messageBytes = encoder.encode(message);

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, messageBytes);
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return '';
  }
}

export interface WebSocketMessage {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export type WsMessage = WebSocketMessage;

export type WsConnectionStatus =
  'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface UseWebSocketOptions {
  wsPath?: string;
  queryParams?: Record<string, string>;
  authMessage?: () => string;
  onMessage?: (message: string | WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  reconnectAttempts?: number;
  maxReconnectDelay?: number;
  minReconnectDelay?: number;
  connectionTimeout?: number;
  shouldReconnect?: (code: number) => boolean;
  enabled?: boolean;
  /** 启用心跳检测（默认 false） */
  enableHeartbeat?: boolean;
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number;
  /** 心跳超时（毫秒） */
  heartbeatTimeout?: number;
  /** 是否自动使用 JWT token 认证（默认 true） */
  autoAuthToken?: boolean;
}

// W7 P0：默认入口改为显式通知路由（/ws/core 在单体无路由，握手必然失败）。
const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/core/notifications`;

/** 服务端可订阅频道白名单（与 ws.rs `WS_CHANNEL_WHITELIST` 对齐） */
const WS_SERVER_CHANNELS = new Set(['alerts', 'notifications', 'events', 'permissions']);

function nextRpcId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // ignore
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/** 超管：取当前切租户 ID；非超管返回 null（租户由 token 决定） */
function getSuperuserTenantId(): string | null {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null') as {
      is_superuser?: boolean;
    } | null;
    if (user?.is_superuser !== true) return null;
    return localStorage.getItem('current_tenant_id');
  } catch {
    return null;
  }
}

function resolveWsBase(): string {
  return (
    (import.meta.env.VITE_WS_URL as string | undefined) ||
    `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
  );
}

/** 拼接连接 URL：token + 超管租户（普通用户租户以 token claims 为准） */
function buildWsUrl(baseUrl: string, token: string | null, extra?: Record<string, string>): string {
  const params: Record<string, string> = { ...extra };
  if (token) params.token = token;
  const tenantId = getSuperuserTenantId();
  if (tenantId) params.tenant_id = tenantId;
  return Object.keys(params).length > 0
    ? `${baseUrl}?${new URLSearchParams(params).toString()}`
    : baseUrl;
}

class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectMinDelay = 1000;
  private readonly reconnectMaxDelay = 30000;
  private subscriptions: Map<string, Set<(message: WebSocketMessage) => void>> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private isConnecting = false;
  private heartbeatMonitor: HeartbeatMonitor | null = null;
  private readonly enableHeartbeat = false;
  private readonly heartbeatInterval = 30000;
  private readonly heartbeatTimeout = 10000;
  private authToken: string | null = null;
  private onAuthFailed?: (error: string) => void;
  private onAuthSuccess?: (data: Record<string, unknown>) => void;
  /** 已在服务端订阅的频道（重连后按此集合补发 subscribe） */
  private subscribedChannels = new Set<string>();

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  setAuthHandlers(
    onFailed: (error: string) => void,
    onSuccess: (data: Record<string, unknown>) => void
  ): void {
    this.onAuthFailed = onFailed;
    this.onAuthSuccess = onSuccess;
  }

  private getWsUrl(): string {
    if (!this.authToken) return WS_URL;
    const params = new URLSearchParams({ token: this.authToken });
    // W7 P0：超管 token 不含租户，连接必须显式指定当前租户，否则服务端拒绝握手（403）。
    // 普通用户的租户以 token claims 为准，不能由前端覆盖。
    const tenantId = getSuperuserTenantId();
    if (tenantId) params.set('tenant_id', tenantId);
    return `${WS_URL}?${params.toString()}`;
  }

  connect(): Promise<void> {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        const wsUrl = this.getWsUrl();
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
          logger.info('[WebSocket] Connected');
          this.reconnectAttempts = 0;
          this.isConnecting = false;
          this.connectionPromise = null;
          this.resubscribeAll();
          this.startHeartbeatIfEnabled();
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const raw = JSON.parse(event.data) as Record<string, unknown>;

            // 契约 §3：JSON-RPC 2.0 帧（心跳 / 订阅应答 / event）
            if (raw.jsonrpc === '2.0') {
              const method = raw.method as string | undefined;
              if (method === 'ping') {
                this.socket?.send(
                  JSON.stringify({ jsonrpc: '2.0', id: raw.id ?? null, method: 'pong' })
                );
                return;
              }
              const result = raw.result as Record<string, unknown> | undefined;
              if (method === undefined && result?.status === 'pong') {
                this.heartbeatMonitor?.recordPong();
                return;
              }
              if (method === 'event') {
                const params = (raw.params ?? {}) as Record<string, unknown>;
                const message: WebSocketMessage = {
                  type: String(params.event ?? 'event'),
                  payload: (params.data ?? {}) as Record<string, unknown>,
                  timestamp: Number(params.ts ?? Date.now()),
                };
                this.notifySubscribers(message, params.channel as string | undefined);
                return;
              }
              // subscribe/unsubscribe 应答
              return;
            }

            const message = raw as unknown as WebSocketMessage;
            // 识别 pong 响应，重置心跳超时
            if (message.type === 'pong' && this.heartbeatMonitor) {
              this.heartbeatMonitor.recordPong();
              return;
            }
            // 处理认证结果
            if (message.type === 'auth_failed') {
              const errorMsg =
                ((message.payload as Record<string, unknown>)?.message as string) ||
                'Authentication failed';
              logger.error('[WebSocket] Authentication failed:', errorMsg);
              this.onAuthFailed?.(errorMsg);
              return;
            }
            if (message.type === 'auth_success') {
              logger.info('[WebSocket] Authentication succeeded');
              this.onAuthSuccess?.(message.payload as Record<string, unknown>);
            }
            this.notifySubscribers(message);
          } catch (error) {
            logger.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.socket.onclose = () => {
          logger.info('[WebSocket] Disconnected');
          this.stopHeartbeat();
          this.socket = null;
          this.isConnecting = false;
          this.connectionPromise = null;
          this.scheduleReconnect();
        };

        this.socket.onerror = (error) => {
          logger.error('[WebSocket] Error:', error);
          this.isConnecting = false;
          this.connectionPromise = null;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        this.connectionPromise = null;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  private startHeartbeatIfEnabled(): void {
    if (!this.enableHeartbeat || !this.socket) return;
    this.heartbeatMonitor = new HeartbeatMonitor(
      () => {
        void this.sendJsonRpc('ping', {});
      },
      () => {
        logger.warn('[WebSocket] Heartbeat timeout, forcing reconnect');
        this.socket?.close(4001, 'Heartbeat timeout');
      },
      this.heartbeatInterval,
      this.heartbeatTimeout
    );
    this.heartbeatMonitor.start();
  }

  private stopHeartbeat(): void {
    this.heartbeatMonitor?.stop();
    this.heartbeatMonitor = null;
  }

  private scheduleReconnect(): void {
    // 达到最大重试次数后不永久放弃：重置计数并按最大退避持续低频重试，
    // 使瞬时断连（如服务重启窗口）恢复后页面可自愈，无需手动刷新。
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.warn(
        `[WebSocket] Max reconnect attempts reached, continuing with backoff (attempt ${this.reconnectAttempts})`
      );
      this.reconnectAttempts = this.maxReconnectAttempts - 1;
    }

    // 使用指数退避 + 抖动算法
    const delay = getNextReconnectDelay(this.reconnectAttempts, {
      ...DEFAULT_RECONNECT_STRATEGY,
      minDelay: this.reconnectMinDelay,
      maxDelay: this.reconnectMaxDelay,
    });
    this.reconnectAttempts++;

    setTimeout(() => {
      logger.info(
        `[WebSocket] Reconnecting (attempt ${this.reconnectAttempts}, delay ${delay}ms)...`
      );
      this.connect().catch(() => {});
    }, delay);
  }

  /**
   * 注册本地消息处理器。key 可为服务端频道名或消息类型（兼容历史 type 分发）；
   * 服务端频道订阅须显式调用 `subscribeChannel`。
   */
  subscribe(channel: string, handler: (message: WebSocketMessage) => void): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }

    this.subscriptions.get(channel)!.add(handler);

    return () => {
      this.unsubscribe(channel, handler);
    };
  }

  unsubscribe(channel: string, handler: (message: WebSocketMessage) => void): void {
    const handlers = this.subscriptions.get(channel);
    if (handlers) {
      handlers.delete(handler);

      if (handlers.size === 0) {
        this.subscriptions.delete(channel);
      }
    }
  }

  /** 订阅服务端频道（JSON-RPC 2.0 subscribe；频道必须在服务端白名单内） */
  subscribeChannel(channel: string): void {
    if (!WS_SERVER_CHANNELS.has(channel)) {
      logger.warn(`[WebSocket] 拒绝订阅未知频道: ${channel}`);
      return;
    }
    this.subscribedChannels.add(channel);
    if (this.socket?.readyState === WebSocket.OPEN) {
      void this.sendJsonRpc('subscribe', { channel });
    }
  }

  /** 取消服务端频道订阅（JSON-RPC 2.0 unsubscribe） */
  unsubscribeChannel(channel: string): void {
    this.subscribedChannels.delete(channel);
    if (this.socket?.readyState === WebSocket.OPEN) {
      void this.sendJsonRpc('unsubscribe', { channel });
    }
  }

  private resubscribeAll(): void {
    this.subscribedChannels.forEach((channel) => {
      void this.sendJsonRpc('subscribe', { channel });
    });
  }

  private notifySubscribers(message: WebSocketMessage, channel?: string): void {
    const keys = new Set<string>([message.type]);
    if (channel) keys.add(channel);
    keys.forEach((key) => {
      const handlers = this.subscriptions.get(key);
      if (!handlers) return;
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          logger.error('[WebSocket] Handler error:', error);
        }
      });
    });
  }

  async send(message: { type: string; payload?: Record<string, unknown> }): Promise<void> {
    if (this.socket?.readyState !== WebSocket.OPEN) return;

    const plainMessage = JSON.stringify(message);
    const signature = await generateSignature(plainMessage);

    const signedMessage = signature ? JSON.stringify({ ...message, signature }) : plainMessage;

    this.socket.send(signedMessage);
  }

  /** 发送 JSON-RPC 2.0 帧（subscribe/unsubscribe 等写操作须带签名） */
  private async sendJsonRpc(method: string, params: Record<string, unknown>): Promise<void> {
    if (this.socket?.readyState !== WebSocket.OPEN) return;

    const frame: Record<string, unknown> = {
      jsonrpc: '2.0',
      id: nextRpcId(),
      method,
      params,
    };
    const plainMessage = JSON.stringify(frame);
    const signature = await generateSignature(plainMessage);

    this.socket.send(signature ? JSON.stringify({ ...frame, signature }) : plainMessage);
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const webSocketService = new WebSocketService();

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    wsPath,
    queryParams,
    authMessage,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectAttempts = 5,
    maxReconnectDelay = 30000,
    minReconnectDelay = 1000,
    connectionTimeout = 10000,
    shouldReconnect,
    enabled = true,
    enableHeartbeat = false,
    heartbeatInterval = 30000,
    heartbeatTimeout = 10000,
    autoAuthToken = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<WsConnectionStatus>('disconnected');
  const [reconnectCount, setReconnectCount] = useState(0);
  const [error, setError] = useState<Event | null>(null);
  const [authStatus, setAuthStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const connectTimeoutRef = useRef<number | null>(null);
  const heartbeatMonitorRef = useRef<HeartbeatMonitor | null>(null);
  // 重连计数 ref：handleClose 闭包跨渲染单调递增，onopen/effect 初始化时清零
  const reconnectCountRef = useRef(0);
  // 回调 ref：避免 onMessage/onOpen/onClose/onError/authMessage/shouldReconnect 引用变化触发 effect 重建
  const callbacksRef = useRef({
    onMessage,
    onOpen,
    onClose,
    onError,
    authMessage,
    shouldReconnect,
  });
  callbacksRef.current = { onMessage, onOpen, onClose, onError, authMessage, shouldReconnect };
  const authToken = localStorage.getItem('token') ?? '';
  const token = autoAuthToken ? authToken : null;

  useEffect(() => {
    if (!enabled) return;

    // 首次/配置变化时重置重连计数（重连循环由 handleClose 驱动）
    reconnectCountRef.current = 0;
    setReconnectCount(0);

    const url = wsPath ? `${resolveWsBase()}${wsPath}` : WS_URL;

    const fullUrl = buildWsUrl(url, token, queryParams);

    const startHeartbeat = (ws: WebSocket) => {
      if (!enableHeartbeat) return;
      heartbeatMonitorRef.current = new HeartbeatMonitor(
        () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({ jsonrpc: '2.0', id: nextRpcId(), method: 'ping', params: {} })
            );
          }
        },
        () => {
          logger.warn('[WebSocket] Heartbeat timeout, forcing reconnect');
          ws.close(4001, 'Heartbeat timeout');
        },
        heartbeatInterval,
        heartbeatTimeout
      );
      heartbeatMonitorRef.current.start();
    };

    const stopHeartbeat = () => {
      heartbeatMonitorRef.current?.stop();
      heartbeatMonitorRef.current = null;
    };

    const connect = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }

      setConnectionStatus('connecting');
      socketRef.current = new WebSocket(fullUrl);

      connectTimeoutRef.current = window.setTimeout(() => {
        if (socketRef.current?.readyState === WebSocket.CONNECTING) {
          socketRef.current.close(4008, 'Connection timeout');
          handleClose({ code: 4008, reason: 'Connection timeout', wasClean: false } as CloseEvent);
        }
      }, connectionTimeout);

      socketRef.current.onopen = () => {
        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
        }
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectCountRef.current = 0;
        setReconnectCount(0);
        setError(null);
        callbacksRef.current.authMessage?.();
        callbacksRef.current.onOpen?.();
        startHeartbeat(socketRef.current!);
      };

      socketRef.current.onmessage = (event) => {
        let message: string | WebSocketMessage = event.data;
        try {
          const raw = JSON.parse(event.data) as Record<string, unknown>;
          // 契约 §3：JSON-RPC 心跳（服务端 ping → 客户端 pong；客户端 ping → result.status=pong）
          if (raw.jsonrpc === '2.0') {
            if (raw.method === 'ping') {
              socketRef.current?.send(
                JSON.stringify({ jsonrpc: '2.0', id: raw.id ?? null, method: 'pong' })
              );
              return;
            }
            const result = raw.result as Record<string, unknown> | undefined;
            if (raw.method === undefined && result?.status === 'pong') {
              heartbeatMonitorRef.current?.recordPong();
              return;
            }
          }
          const parsed = raw as unknown as WebSocketMessage;
          // 识别 pong 响应，重置心跳超时
          if (parsed.type === 'pong' && heartbeatMonitorRef.current) {
            heartbeatMonitorRef.current.recordPong();
            return;
          }
          // 处理认证结果
          if (parsed.type === 'auth_failed') {
            const errorMsg =
              ((parsed.payload as Record<string, unknown>)?.message as string) ||
              'Authentication failed';
            logger.error('[WebSocket] Authentication failed:', errorMsg);
            setAuthStatus('failed');
            setIsConnected(false);
            setConnectionStatus('error');
          } else if (parsed.type === 'auth_success') {
            logger.info('[WebSocket] Authentication succeeded');
            setAuthStatus('success');
          }
          message = parsed;
        } catch (e) {
          console.error('[WebSocket] Failed to parse incoming message', e);
        }
        callbacksRef.current.onMessage?.(message);
      };

      socketRef.current.onclose = handleClose;
      socketRef.current.onerror = handleError;
    };

    const handleClose = (event: CloseEvent) => {
      stopHeartbeat();
      setIsConnected(false);
      setConnectionStatus('disconnected');
      callbacksRef.current.onClose?.(event);

      if (
        enabled &&
        (!callbacksRef.current.shouldReconnect || callbacksRef.current.shouldReconnect(event.code))
      ) {
        if (reconnectCountRef.current < reconnectAttempts) {
          // 使用指数退避 + 抖动算法
          const delay = calculateBackoffDelay(
            reconnectCountRef.current,
            minReconnectDelay,
            maxReconnectDelay
          );
          reconnectCountRef.current += 1;
          setReconnectCount(reconnectCountRef.current);
          setConnectionStatus('reconnecting');
          logger.info(
            `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current}/${reconnectAttempts})...`
          );
          reconnectTimeoutRef.current = window.setTimeout(connect, delay);
        } else {
          // 达到上限不永久放弃：按最大退避持续低频重试，服务恢复后自愈
          setConnectionStatus('reconnecting');
          logger.warn(
            `[WebSocket] Max reconnect attempts reached, continuing with backoff (attempt ${reconnectCountRef.current})`
          );
          const delay = calculateBackoffDelay(
            reconnectAttempts - 1,
            minReconnectDelay,
            maxReconnectDelay
          );
          reconnectTimeoutRef.current = window.setTimeout(connect, delay);
        }
      }
    };

    const handleError = (event: Event) => {
      setError(event);
      setConnectionStatus('error');
      callbacksRef.current.onError?.(event);
    };

    connect();

    return () => {
      stopHeartbeat();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
      socketRef.current?.close(1000, 'Component unmounted');
    };
  }, [
    enabled,
    wsPath,
    queryParams,
    reconnectAttempts,
    maxReconnectDelay,
    minReconnectDelay,
    connectionTimeout,
    enableHeartbeat,
    heartbeatInterval,
    heartbeatTimeout,
    autoAuthToken,
    token,
  ]);

  const send = useCallback(async (data: string | Record<string, unknown>) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;

    const plainMessage = typeof data === 'string' ? data : JSON.stringify(data);
    const signature = await generateSignature(plainMessage);

    const messageToSend =
      signature && typeof data !== 'string' ? JSON.stringify({ ...data, signature }) : plainMessage;

    socketRef.current.send(messageToSend);
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      setAuthStatus('pending');
      const url = wsPath ? `${resolveWsBase()}${wsPath}` : WS_URL;
      const fullUrl = buildWsUrl(url, token, queryParams);
      socketRef.current = new WebSocket(fullUrl);
    }
  }, [wsPath, queryParams, token, autoAuthToken]);

  const disconnect = useCallback(() => {
    heartbeatMonitorRef.current?.stop();
    heartbeatMonitorRef.current = null;
    socketRef.current?.close(1000, 'Manual disconnect');
    socketRef.current = null;
  }, []);

  return {
    isConnected,
    connectionStatus,
    reconnectCount,
    error,
    authStatus,
    connect,
    disconnect,
    send,
  };
}
