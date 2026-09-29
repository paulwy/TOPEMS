import { useCallback, useMemo } from 'react';
import {
  useWebSocket,
  type WsConnectionStatus,
  type UseWebSocketOptions,
  type WsMessage,
} from './useWebSocket';
import { useAuthStore } from '@/store/authStore';
import { apiLogger } from '@/utils/logger';

interface UseDashboardWebSocketOptions extends Omit<
  UseWebSocketOptions,
  'authMessage' | 'queryParams'
> {
  dashboardId?: string;
  module?: 'mes' | 'bi' | 'gis';
}

const MODULE_WS_PATHS: Record<string, string> = {
  mes: '/ws/mes/dashboard',
  bi: '/ws/bi/dashboard',
  gis: '/ws/gis/map',
};

export function useDashboardWebSocket(options: UseDashboardWebSocketOptions = {}) {
  const {
    dashboardId,
    module = 'mes',
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectAttempts = 3,
    maxReconnectDelay = 30000,
    minReconnectDelay = 1000,
    connectionTimeout = 10000,
    shouldReconnect,
    enabled = false, // WS未挂载路由，全局关闭不连接
  } = options;

  const { token } = useAuthStore();

  const wsPath = useMemo(() => {
    const basePath = MODULE_WS_PATHS[module] || MODULE_WS_PATHS.mes;
    if (dashboardId && module === 'bi') {
      return `${basePath}/${dashboardId}`;
    }
    return basePath;
  }, [module, dashboardId]);

  const queryParams = useMemo(() => {
    if (token) {
      return { token };
    }
    return;
  }, [token]);

  const authMessage = useCallback(() => {
    return JSON.stringify({ type: 'authenticate' });
  }, []);

  const handleMessage = useCallback(
    (message: string | WsMessage) => {
      try {
        const payload = typeof message === 'string' ? JSON.parse(message) : message;
        apiLogger.info(
          `[DashboardWS] Received message: ${JSON.stringify(payload).substring(0, 200)}`
        );

        if (payload?.type === 'connected') {
          apiLogger.info('[DashboardWS] Connection confirmed');
        }

        onMessage?.(payload);
      } catch (err) {
        apiLogger.warn('[DashboardWS] Failed to parse message:', err);
        onMessage?.(message);
      }
    },
    [onMessage]
  );

  const { isConnected, connectionStatus, reconnectCount, error, connect, disconnect, send } =
    useWebSocket({
      wsPath,
      queryParams,
      authMessage,
      onMessage: handleMessage,
      onOpen: () => {
        apiLogger.info('[DashboardWS] Connected');
        onOpen?.();
      },
      onClose: (event) => {
        apiLogger.info(`[DashboardWS] Disconnected: code=${event.code}, reason=${event.reason}`);
        onClose?.(event);
      },
      onError: (event) => {
        apiLogger.debug('[DashboardWS] Error:', event);
        onError?.(event);
      },
      reconnectAttempts,
      maxReconnectDelay,
      minReconnectDelay,
      connectionTimeout,
      shouldReconnect:
        shouldReconnect ||
        ((code) => {
          if (code === 1000 || code === 1001) {
            apiLogger.info('[DashboardWS] Normal close, skipping reconnect');
            return false;
          }
          return true;
        }),
      enabled,
    });

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

export type { WsConnectionStatus };
