import { useEffect, useRef, useState, useCallback } from 'react';
import config from '../config/runtime';

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
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectAttempts = config.ws.maxReconnectAttempts,
    reconnectInterval = config.ws.reconnectInterval,
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

    const imServiceUrl = config.services.im;
    let wsUrl = imServiceUrl;
    
    if (wsUrl.startsWith('/')) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      const port = window.location.port ? `:${window.location.port}` : '';
      const host = hostname === 'localhost' ? '127.0.0.1' + port : window.location.host;
      wsUrl = `${protocol}//${host}${wsUrl}`;
    } else {
      wsUrl = wsUrl.replace('http://', 'ws://').replace('https://', 'wss://');
    }
    
    const fullWsUrl = `${wsUrl}/ws`;
    console.log('[useWebSocket] Attempting to connect to:', fullWsUrl);
    
    const ws = new WebSocket(fullWsUrl);

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
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = (event) => {
      console.log('[useWebSocket] Connection closed:', event.code, event.reason);
      setIsConnected(false);
      callbacksRef.current.onClose?.();

      if (reconnectCountRef.current < reconnectAttempts) {
        reconnectCountRef.current++;
        console.log('[useWebSocket] Reconnecting attempt:', reconnectCountRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    };

    ws.onerror = (event) => {
      console.error('[useWebSocket] Connection error:', event);
      setError(event);
      callbacksRef.current.onError?.(event);
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
      console.error('WebSocket is not connected');
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
