import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/store';
import type { WsMessage } from './useWebSocket';
import config from '@/config/runtime';
import { logger } from '@/utils/logger';

const WS_PATH = '/ws/core/im';

export interface ImWsMessage {
  msg_type: string;
  chat_id?: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
}

type ImConnectionStatus =
  'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

interface UseImWebSocketOptions {
  onMessage?: (message: string | ImWsMessage) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectDelay?: number;
  minReconnectDelay?: number;
  connectionTimeout?: number;
  authMessage?: string | (() => string);
  shouldReconnect?: (code: number) => boolean;
  sendAuthOnOpen?: boolean;
  enabled?: boolean;
}

export function useImWebSocket(options: UseImWebSocketOptions = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectAttempts = config.ws.maxReconnectAttempts,
    reconnectInterval = config.ws.reconnectInterval,
    maxReconnectDelay = 30000,
    minReconnectDelay = 1000,
    connectionTimeout = 10000,
    authMessage,
    shouldReconnect = (code) => code !== 1000 && code !== 1001,
    sendAuthOnOpen = true,
    enabled = true,
  } = options;

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ImConnectionStatus>('disconnected');
  const [reconnectCount, setReconnectCount] = useState(0);
  const [error, setError] = useState<Event | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const isInitRef = useRef(false);

  const callbacksRef = useRef({ onMessage, onOpen, onClose, onError });
  callbacksRef.current = { onMessage, onOpen, onClose, onError };

  const buildWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let url = `${protocol}//${window.location.host}${WS_PATH}`;
    const params: Record<string, string> = {};
    if (token) params.token = token;
    if (user?.id) params.user_id = user.id;
    if (Object.keys(params).length > 0) {
      url += `?${new URLSearchParams(params).toString()}`;
    }
    return url;
  }, [token, user?.id]);

  const resetConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectCountRef.current >= reconnectAttempts) {
      logger.warn('[useImWebSocket] max reconnect attempts reached');
      setConnectionStatus('error');
      return;
    }
    const attempt = reconnectCountRef.current + 1;
    const delay = Math.min(
      maxReconnectDelay,
      reconnectInterval * Math.pow(2, reconnectCountRef.current)
    );
    const jitter = Math.random() * minReconnectDelay;
    const totalDelay = delay + jitter;
    logger.info(
      `[useImWebSocket] scheduling reconnect attempt ${attempt}/${reconnectAttempts} in ${Math.round(totalDelay)}ms`
    );
    setConnectionStatus('reconnecting');
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectCountRef.current = attempt;
      setReconnectCount(attempt);
      connectInternal();
    }, totalDelay);
  }, [reconnectAttempts, reconnectInterval, maxReconnectDelay, minReconnectDelay]);

  const connectInternal = useCallback(() => {
    if (!enabled) {
      logger.info('[useImWebSocket] disabled, skipping connection');
      return;
    }

    if (typeof window === 'undefined' || !('WebSocket' in window)) {
      logger.warn('[useImWebSocket] WebSocket not supported');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      logger.warn('[useImWebSocket] already connected');
      return;
    }

    if (isConnectingRef.current) {
      logger.warn('[useImWebSocket] already connecting');
      return;
    }

    if (!reconnectCountRef.current && isInitRef.current) {
      logger.info('[useImWebSocket] already initialized');
      return;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'Reconnecting');
      } catch (_) {
        // ignore
      }
      wsRef.current = null;
    }

    isConnectingRef.current = true;
    const isReconnecting = reconnectCountRef.current > 0;
    if (isReconnecting) {
      setConnectionStatus('reconnecting');
    } else {
      setConnectionStatus('connecting');
    }
    setError(null);

    try {
      const wsUrl = buildWsUrl();
      logger.info('[useImWebSocket] connecting to', WS_PATH);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      connectTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          logger.warn('[useImWebSocket] connection timeout');
          try {
            ws.close(1000, 'Connection timeout');
          } catch (_) {
            // ignore
          }
        }
      }, connectionTimeout);

      ws.onopen = () => {
        resetConnectTimeout();
        isConnectingRef.current = false;
        isInitRef.current = true;
        reconnectCountRef.current = 0;
        setReconnectCount(0);
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        logger.info('[useImWebSocket] connected');

        if (sendAuthOnOpen) {
          try {
            const payload =
              typeof authMessage === 'function'
                ? authMessage()
                : authMessage ||
                  JSON.stringify({
                    type: 'auth',
                    token,
                    user_id: user?.id,
                  });
            ws.send(payload);
          } catch (sendErr) {
            logger.warn('[useImWebSocket] failed to send auth message:', sendErr);
          }
        }

        if (callbacksRef.current.onOpen) {
          try {
            callbacksRef.current.onOpen();
          } catch (cbErr) {
            logger.warn('[useImWebSocket] onOpen callback error:', cbErr);
          }
        }
      };

      ws.onmessage = (event) => {
        if (!callbacksRef.current.onMessage) return;
        try {
          let msg: string | ImWsMessage = event.data;
          try {
            const parsed = JSON.parse(event.data) as ImWsMessage;
            msg = parsed;
          } catch (_) {
            // keep as string
          }
          callbacksRef.current.onMessage(msg);
        } catch (cbErr) {
          logger.warn('[useImWebSocket] onMessage callback error:', cbErr);
        }
      };

      ws.onerror = (ev) => {
        logger.warn('[useImWebSocket] error occurred');
        setError(ev);
        if (callbacksRef.current.onError) {
          try {
            callbacksRef.current.onError(ev);
          } catch (cbErr) {
            logger.warn('[useImWebSocket] onError callback error:', cbErr);
          }
        }
      };

      ws.onclose = (event) => {
        resetConnectTimeout();
        isConnectingRef.current = false;
        setIsConnected(false);

        const prevStatus = connectionStatus;
        if (prevStatus === 'connecting' || prevStatus === 'reconnecting') {
          setConnectionStatus('disconnected');
        }

        logger.info(`[useImWebSocket] disconnected code=${event.code} reason="${event.reason}"`);

        if (callbacksRef.current.onClose) {
          try {
            callbacksRef.current.onClose(event);
          } catch (cbErr) {
            logger.warn('[useImWebSocket] onClose callback error:', cbErr);
          }
        }

        const reconnecting = reconnectTimeoutRef.current != null;
        wsRef.current = null;
        if (!reconnecting && shouldReconnect(event.code) && enabled) {
          scheduleReconnect();
        }
      };
    } catch (err) {
      logger.warn('[useImWebSocket] connection creation failed:', err);
      isConnectingRef.current = false;
      setConnectionStatus('error');
      setError(null);
    }
  }, [
    enabled,
    buildWsUrl,
    connectionTimeout,
    resetConnectTimeout,
    sendAuthOnOpen,
    authMessage,
    token,
    user?.id,
    shouldReconnect,
    scheduleReconnect,
  ]);

  const connect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectCountRef.current = 0;
    setReconnectCount(0);
    connectInternal();
  }, [connectInternal]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    resetConnectTimeout();
    isInitRef.current = false;
    isConnectingRef.current = false;
    reconnectCountRef.current = 0;

    const ws = wsRef.current;
    wsRef.current = null;

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      try {
        ws.close(1000, 'Client disconnect');
      } catch (_) {
        // ignore
      }
    }
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setError(null);
    setReconnectCount(0);
  }, [resetConnectTimeout]);

  const send = useCallback((data: string | object) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logger.warn('[useImWebSocket] send failed: not connected');
      return false;
    }
    try {
      const payload = typeof data === 'string' ? data : JSON.stringify(data);
      ws.send(payload);
      return true;
    } catch (err) {
      logger.warn('[useImWebSocket] send error:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      const timer = setTimeout(() => connect(), 50);
      return () => clearTimeout(timer);
    }
    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled]);

  return {
    isConnected,
    connectionStatus,
    reconnectCount,
    error,
    connect,
    disconnect,
    send,
  };
}

export default useImWebSocket;
