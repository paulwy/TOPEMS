import { useEffect, useCallback, useRef, useState } from 'react';
import { logger } from '@/utils/logger';
import {
  calculateBackoffDelay,
  HeartbeatMonitor,
  getNextReconnectDelay,
  DEFAULT_RECONNECT_STRATEGY,
} from '@/utils/websocket-optimizer';
import { useAuthToken } from '@/store/authStore';

const WS_SIGNING_SECRET = import.meta.env.VITE_WS_SIGNING_SECRET || 'topems-ws-signing-secret';

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

export interface SubscriptionConfig {
  channel: string;
  handler: (message: WebSocketMessage) => void;
}

const WS_URL =
  (import.meta.env.VITE_WS_URL as string | undefined) ||
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

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
    if (this.authToken) {
      return `${WS_URL}?token=${encodeURIComponent(this.authToken)}`;
    }
    return WS_URL;
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
            const message: WebSocketMessage = JSON.parse(event.data);
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
        this.send({ type: 'ping', payload: {} });
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
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[WebSocket] Max reconnect attempts reached');
      return;
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

  subscribe(channel: string, handler: (message: WebSocketMessage) => void): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }

    this.subscriptions.get(channel)!.add(handler);

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', payload: { channel } });
    }

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
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.send({ type: 'unsubscribe', payload: { channel } });
        }
      }
    }
  }

  private resubscribeAll(): void {
    this.subscriptions.forEach((_, channel) => {
      this.send({ type: 'subscribe', payload: { channel } });
    });
  }

  private notifySubscribers(message: WebSocketMessage): void {
    const handlers = this.subscriptions.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          logger.error('[WebSocket] Handler error:', error);
        }
      });
    }
  }

  async send(message: { type: string; payload?: Record<string, unknown> }): Promise<void> {
    if (this.socket?.readyState !== WebSocket.OPEN) return;

    const plainMessage = JSON.stringify(message);
    const signature = await generateSignature(plainMessage);

    const signedMessage = signature ? JSON.stringify({ ...message, signature }) : plainMessage;

    this.socket.send(signedMessage);
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

export function useWebSocketSubscription(
  channel: string,
  handler: (message: WebSocketMessage) => void,
  enabled = true
): { isConnected: boolean; reconnect: () => void; authStatus: 'pending' | 'success' | 'failed' } {
  const [isConnected, setIsConnected] = useState(false);
  const [authStatus, setAuthStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const handlerRef = useRef(handler);
  const token = useAuthToken();

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    webSocketService.setAuthToken(token);
    webSocketService.setAuthHandlers(
      (error) => {
        logger.error('[WebSocket] Auth failed:', error);
        setAuthStatus('failed');
        setIsConnected(false);
      },
      (data) => {
        logger.info('[WebSocket] Auth success:', data);
        setAuthStatus('success');
      }
    );
  }, [token]);

  useEffect(() => {
    if (!enabled) return;

    let unsubscribe: (() => void) | null = null;

    const connectAndSubscribe = async () => {
      try {
        await webSocketService.connect();
        setIsConnected(true);

        unsubscribe = webSocketService.subscribe(channel, (message) => {
          handlerRef.current(message);
        });
      } catch (error) {
        setIsConnected(false);
        setAuthStatus('failed');
      }
    };

    connectAndSubscribe();

    const checkConnection = setInterval(() => {
      setIsConnected(webSocketService.isConnected());
    }, 1000);

    return () => {
      clearInterval(checkConnection);
      unsubscribe?.();
    };
  }, [channel, enabled]);

  const reconnect = useCallback(() => {
    setAuthStatus('pending');
    webSocketService.connect();
  }, []);

  return { isConnected, reconnect, authStatus };
}

export function useWebSocketConnection(): {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
} {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const checkConnection = setInterval(() => {
      setIsConnected(webSocketService.isConnected());
    }, 1000);

    return () => clearInterval(checkConnection);
  }, []);

  const connect = useCallback(() => {
    webSocketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  return { isConnected, connect, disconnect };
}

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
  const authToken = useAuthToken();
  const token = autoAuthToken ? authToken : null;

  useEffect(() => {
    if (!enabled) return;

    const url = wsPath
      ? `${(import.meta.env.VITE_WS_URL as string | undefined) || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`}${wsPath}`
      : WS_URL;

    const params: Record<string, string> = { ...queryParams };
    if (token && autoAuthToken) {
      params.token = token;
    }

    const fullUrl =
      Object.keys(params).length > 0 ? `${url}?${new URLSearchParams(params).toString()}` : url;

    const startHeartbeat = (ws: WebSocket) => {
      if (!enableHeartbeat) return;
      heartbeatMonitorRef.current = new HeartbeatMonitor(
        () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', payload: {} }));
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
        setReconnectCount(0);
        setError(null);
        authMessage?.();
        onOpen?.();
        startHeartbeat(socketRef.current!);
      };

      socketRef.current.onmessage = (event) => {
        let message: string | WebSocketMessage = event.data;
        try {
          const parsed = JSON.parse(event.data) as WebSocketMessage;
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
        } catch {}
        onMessage?.(message);
      };

      socketRef.current.onclose = handleClose;
      socketRef.current.onerror = handleError;
    };

    const handleClose = (event: CloseEvent) => {
      stopHeartbeat();
      setIsConnected(false);
      setConnectionStatus('disconnected');
      onClose?.(event);

      if (enabled && (!shouldReconnect || shouldReconnect(event.code))) {
        if (reconnectCount < reconnectAttempts) {
          // 使用指数退避 + 抖动算法
          const delay = calculateBackoffDelay(reconnectCount, minReconnectDelay, maxReconnectDelay);
          setReconnectCount((prev) => prev + 1);
          setConnectionStatus('reconnecting');
          logger.info(
            `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectCount + 1}/${reconnectAttempts})...`
          );
          reconnectTimeoutRef.current = window.setTimeout(connect, delay);
        } else {
          setConnectionStatus('error');
          logger.error('[WebSocket] Max reconnect attempts reached');
        }
      }
    };

    const handleError = (event: Event) => {
      setError(event);
      setConnectionStatus('error');
      onError?.(event);
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
    authMessage,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectAttempts,
    maxReconnectDelay,
    minReconnectDelay,
    connectionTimeout,
    shouldReconnect,
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
      setReconnectCount(0);
      setAuthStatus('pending');
      const url = wsPath
        ? `${(import.meta.env.VITE_WS_URL as string | undefined) || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`}${wsPath}`
        : WS_URL;
      const params: Record<string, string> = { ...queryParams };
      if (token && autoAuthToken) {
        params.token = token;
      }
      const fullUrl =
        Object.keys(params).length > 0 ? `${url}?${new URLSearchParams(params).toString()}` : url;
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
