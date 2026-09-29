import { useCallback, useMemo } from 'react';
import { useWebSocket, type WsConnectionStatus, type UseWebSocketOptions } from './useWebSocket';
import { useAuthStore } from '@/store';
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

type ImConnectionStatus = WsConnectionStatus;

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
    enabled = false, // IM WS未部署，默认关闭
  } = options;

  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const wsPath = WS_PATH;

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (token) params.token = token;
    if (user?.id) params.user_id = user.id;
    return Object.keys(params).length > 0 ? params : undefined;
  }, [token, user?.id]);

  const buildAuthMessage = useCallback((): string | undefined => {
    if (!sendAuthOnOpen) return undefined;
    if (typeof authMessage === 'function') return authMessage();
    if (typeof authMessage === 'string') return authMessage;
    return JSON.stringify({
      type: 'auth',
      token,
      user_id: user?.id,
    });
  }, [sendAuthOnOpen, authMessage, token, user?.id]);

  const handleMessage = useCallback(
    (message: string | unknown) => {
      if (!onMessage) return;
      if (typeof message === 'string') {
        try {
          const parsed = JSON.parse(message) as ImWsMessage;
          onMessage(parsed);
        } catch (_) {
          onMessage(message);
        }
      } else {
        onMessage(message as ImWsMessage);
      }
    },
    [onMessage]
  );

  const { isConnected, connectionStatus, reconnectCount, error, connect, disconnect, send } =
    useWebSocket({
      wsPath,
      queryParams,
      authMessage: buildAuthMessage,
      onMessage: handleMessage,
      onOpen: () => {
        logger.info('[useImWebSocket] connected');
        onOpen?.();
      },
      onClose: (event) => {
        logger.info(`[useImWebSocket] disconnected code=${event.code} reason="${event.reason}"`);
        onClose?.(event);
      },
      onError: (event) => {
        logger.warn('[useImWebSocket] error occurred');
        onError?.(event);
      },
      reconnectAttempts,
      maxReconnectDelay,
      minReconnectDelay: Math.min(minReconnectDelay, reconnectInterval),
      connectionTimeout,
      shouldReconnect,
      enabled,
      autoAuthToken: false,
    } as UseWebSocketOptions);

  const sendSafe = useCallback(
    (data: string | object): boolean => {
      if (!isConnected) {
        logger.warn('[useImWebSocket] send failed: not connected');
        return false;
      }
      try {
        const payload = typeof data === 'string' ? data : JSON.stringify(data);
        send(payload as string | Record<string, unknown>);
        return true;
      } catch (err) {
        logger.warn('[useImWebSocket] send error:', err);
        return false;
      }
    },
    [isConnected, send]
  );

  return {
    isConnected,
    connectionStatus,
    reconnectCount,
    error,
    connect,
    disconnect,
    send: sendSafe,
  };
}

export type { ImConnectionStatus };
export default useImWebSocket;
