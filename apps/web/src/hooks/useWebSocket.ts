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

export interface UseWebSocketOptions {
  onMessage?: (message: WsMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  wsPath?: string;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectAttempts = config.ws.maxReconnectAttempts,
    reconnectInterval = config.ws.reconnectInterval,
    wsPath,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const callbacksRef = useRef({ onMessage, onOpen, onClose, onError });
  callbacksRef.current = { onMessage, onOpen, onClose, onError };

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    let wsUrl = '';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    if (wsPath) {
      wsUrl = `${protocol}//${window.location.host}${wsPath}`;
    } else {
      const imServiceUrl = config.services.im;
      if (imServiceUrl.startsWith('/')) {
        const servicePath = imServiceUrl.replace(/\/$/, '');
        const path = `/ws/core${servicePath}`;
        wsUrl = `${protocol}//${window.location.host}${path}`;
      } else {
        wsUrl = imServiceUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      }
    }

    logger.info('[useWebSocket] Attempting to connect to:', wsUrl);

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectCountRef.current = 0;
      callbacksRef.current.onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);
        callbacksRef.current.onMessage?.(message);
      } catch (err: unknown) {
        logger.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = (event) => {
      logger.info('[useWebSocket] Connection closed:', event.code, event.reason);
      setIsConnected(false);
      callbacksRef.current.onClose?.();

      if (reconnectCountRef.current < reconnectAttempts) {
        reconnectCountRef.current++;
        logger.info('[useWebSocket] Reconnecting attempt:', reconnectCountRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = (event) => {
      logger.error('[useWebSocket] Connection error:', event);
      setError(event);
      callbacksRef.current.onError?.(event);

      if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
        try {
          ws.close(1011, 'WebSocket error occurred');
        } catch (e) {
          logger.error('[useWebSocket] Failed to close connection on error:', e);
        }
      }
    };

    wsRef.current = ws;
  }, [reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback((message: WsMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      logger.error('WebSocket is not connected');
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    error,
    connect,
    disconnect,
    send,
  };
}
