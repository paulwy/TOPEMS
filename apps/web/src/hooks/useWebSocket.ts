import { useEffect, useRef, useState, useCallback } from 'react';
import config from '../config/runtime';
import { logger } from '@/utils/logger';

export interface WsMessage {
  msg_type: string;
  chat_id?: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
}

export type WsConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface UseWebSocketOptions {
  onMessage?: (message: string | WsMessage) => void;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectDelay?: number;
  minReconnectDelay?: number;
  connectionTimeout?: number;
  wsPath?: string;
  queryParams?: Record<string, string>;
  authMessage?: string | (() => string);
  shouldReconnect?: (code: number) => boolean;
  sendAuthOnOpen?: boolean;
  enabled?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
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
    wsPath,
    queryParams,
    authMessage,
    shouldReconnect = (code) => code !== 1000 && code !== 1001,
    sendAuthOnOpen = true,
    enabled = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<WsConnectionStatus>('disconnected');
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
    const path = wsPath || '/ws/core/im';
    
    let url = `${protocol}//${window.location.host}${path}`;
    
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }
    
    return url;
  }, [wsPath, queryParams]);

  const connect = useCallback(() => {
    if (!enabled) {
      logger.info('[useWebSocket] disabled, skipping connection');
      return;
    }

    if (typeof window === 'undefined' || !('WebSocket' in window)) {
      logger.warn('[useWebSocket] WebSocket not supported');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      logger.warn('[useWebSocket] WebSocket already connected');
      return;
    }

    if (isConnectingRef.current) {
      logger.warn('[useWebSocket] WebSocket already connecting');
      return;
    }

    if (!reconnectCountRef.current && isInitRef.current) {
      logger.info('[useWebSocket] WebSocket already initialized');
      return;
    }

    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'Reconnecting');
      } catch (e) {
        // ignore
      }
      wsRef.current = null;
    }

    isConnectingRef.current = true;
    const isReconnecting = reconnectCountRef.current > 0;
    
    if (isReconnecting) {
      setConnectionStatus('reconnecting');
      logger.info(`[useWebSocket] Reconnect attempt ${reconnectCountRef.current}/${reconnectAttempts}`);
    } else {
      setConnectionStatus('connecting');
    }

    const wsUrl = buildWsUrl();
    logger.info(`[useWebSocket] Connecting to: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    connectTimeoutRef.current = setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        logger.warn(`[useWebSocket] Connection timeout (${connectionTimeout}ms)`);
        try {
          ws.close(1006, 'Connection timeout');
        } catch (e) {
          logger.error('[useWebSocket] Failed to close timeout connection:', e);
        }
        wsRef.current = null;
        isConnectingRef.current = false;
      }
    }, connectionTimeout);

    ws.onopen = () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      
      isConnectingRef.current = false;
      isInitRef.current = true;
      reconnectCountRef.current = 0;
      setReconnectCount(0);
      setIsConnected(true);
      setConnectionStatus('connected');
      setError(null);
      
      logger.info('[useWebSocket] Connected');
      callbacksRef.current.onOpen?.();

      if (sendAuthOnOpen && authMessage) {
        const message = typeof authMessage === 'function' ? authMessage() : authMessage;
        logger.info(`[useWebSocket] Sending auth message: ${message.substring(0, 100)}`);
        ws.send(message);
      }
    };

    ws.onmessage = (event) => {
      try {
        logger.debug(`[useWebSocket] Received message: ${event.data.substring(0, 200)}`);
        
        let parsedMessage: string | WsMessage = event.data;
        try {
          parsedMessage = JSON.parse(event.data);
        } catch {
          // keep as string
        }
        
        callbacksRef.current.onMessage?.(parsedMessage);
      } catch (err) {
        logger.error('[useWebSocket] Failed to process message:', err);
      }
    };

    ws.onclose = (event) => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      
      isConnectingRef.current = false;
      setIsConnected(false);
      setConnectionStatus('disconnected');
      wsRef.current = null;

      const { code, reason, wasClean } = event;
      logger.info(`[useWebSocket] Disconnected: code=${code}, reason=${reason}, wasClean=${wasClean}`);
      callbacksRef.current.onClose?.(event);

      if (!enabled) {
        logger.info('[useWebSocket] disabled, skipping reconnect');
        return;
      }

      if (!shouldReconnect(code)) {
        logger.info('[useWebSocket] Normal close, skipping reconnect');
        return;
      }

      if (reconnectCountRef.current >= reconnectAttempts) {
        logger.error(`[useWebSocket] Max reconnect attempts (${reconnectAttempts}) reached`);
        setConnectionStatus('error');
        reconnectCountRef.current = 0;
        return;
      }

      reconnectCountRef.current += 1;
      const attempt = reconnectCountRef.current;
      
      const delay = Math.min(
        minReconnectDelay * Math.pow(2, attempt - 1),
        maxReconnectDelay
      ) + Math.random() * 1000;

      setReconnectCount(attempt);
      logger.info(`[useWebSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${attempt}/${reconnectAttempts})`);

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = (event) => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      
      setError(event);
      setConnectionStatus('error');
      logger.error('[useWebSocket] Error:', event);
      callbacksRef.current.onError?.(event);

      if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
        try {
          ws.close(1011, 'WebSocket error occurred');
        } catch (e) {
          logger.error('[useWebSocket] Failed to close on error:', e);
        }
      }
    };
  }, [
    enabled,
    reconnectAttempts,
    minReconnectDelay,
    maxReconnectDelay,
    connectionTimeout,
    buildWsUrl,
    authMessage,
    sendAuthOnOpen,
    shouldReconnect,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (connectTimeoutRef.current) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      try {
        wsRef.current.close(1000, 'Manual disconnect');
      } catch (e) {
        logger.error('[useWebSocket] Failed to disconnect:', e);
      }
      wsRef.current = null;
    }
    
    isConnectingRef.current = false;
    isInitRef.current = false;
    reconnectCountRef.current = 0;
    setReconnectCount(0);
    setIsConnected(false);
    setConnectionStatus('disconnected');
    logger.info('[useWebSocket] Disconnected manually');
  }, []);

  const send = useCallback((message: string | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      wsRef.current.send(payload);
    } else {
      logger.error('[useWebSocket] Not connected');
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
      }
    };
  }, []);

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