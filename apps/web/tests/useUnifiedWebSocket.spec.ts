/**
 * @done V79 Phase 4 implemented / V82 Phase 5 updated
 * useUnifiedWebSocket 导出与基本行为单测
 * @see @/hooks/useUnifiedWebSocket
 *
 * V82 调整：snake_case 兼容别名已在 V79 Phase 5 清理，详细验证见
 *   tests/snake-case-compat.spec.ts。
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/config', () => ({
  getEnv: vi.fn(() => ''),
  isDev: vi.fn(() => false),
  isProd: vi.fn(() => false),
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/utils/websocket-optimizer', () => ({
  calculateBackoffDelay: vi.fn(() => 1000),
  HeartbeatMonitor: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    recordPong: vi.fn(),
  })),
  getNextReconnectDelay: vi.fn(() => 1000),
  DEFAULT_RECONNECT_STRATEGY: {
    minDelay: 1000,
    maxDelay: 30000,
    factor: 2,
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthToken: vi.fn(() => null),
}));

import {
  createConnection,
  closeConnection,
  sendMessage,
  subscribeTopic,
  unsubscribeTopic,
  getConnectionStatus,
  reconnectSocket,
  pingServer,
  useUnifiedWebSocket,
  useWebSocket,
  useWebSocketSubscription,
  useWebSocketConnection,
  webSocketService,
} from '@/hooks/useUnifiedWebSocket';
import * as wsModuleNS from '@/hooks/useUnifiedWebSocket';

describe('useUnifiedWebSocket exports', () => {
  describe('camelCase 导出', () => {
    it('should export createConnection function', () => {
      expect(createConnection).toBeDefined();
      expect(typeof createConnection).toBe('function');
    });

    it('should export closeConnection function', () => {
      expect(closeConnection).toBeDefined();
      expect(typeof closeConnection).toBe('function');
    });

    it('should export sendMessage function', () => {
      expect(sendMessage).toBeDefined();
      expect(typeof sendMessage).toBe('function');
    });
  });

  describe('snake_case 别名已移除（V79 Phase 5 清理）', () => {
    // 完整验证见 tests/snake-case-compat.spec.ts；这里只做冒烟测试
    it('should not export legacy snake_case aliases (smoke)', () => {
      const wsModule = wsModuleNS as unknown as Record<string, unknown>;
      expect(wsModule.create_connection).toBeUndefined();
      expect(wsModule.close_connection).toBeUndefined();
      expect(wsModule.send_message).toBeUndefined();
      expect(wsModule.use_unified_web_socket).toBeUndefined();
    });
  });

  describe('其他导出', () => {
    it('should export useWebSocket as alias of useUnifiedWebSocket', () => {
      expect(useWebSocket).toBe(useUnifiedWebSocket);
    });

    it('should export webSocketService instance with expected methods', () => {
      expect(webSocketService).toBeDefined();
      expect(typeof webSocketService.connect).toBe('function');
      expect(typeof webSocketService.disconnect).toBe('function');
      expect(typeof webSocketService.send).toBe('function');
      expect(typeof webSocketService.subscribe).toBe('function');
      expect(typeof webSocketService.unsubscribe).toBe('function');
      expect(typeof webSocketService.isConnected).toBe('function');
    });
  });

  describe('useUnifiedWebSocket hook 基本行为', () => {
    it('should return expected fields when enabled=false', () => {
      const { result } = renderHook(() =>
        useUnifiedWebSocket({ enabled: false })
      );

      expect(result.current).toHaveProperty('isConnected');
      expect(result.current).toHaveProperty('connectionStatus');
      expect(result.current).toHaveProperty('reconnectCount');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('authStatus');
      expect(result.current).toHaveProperty('connect');
      expect(result.current).toHaveProperty('disconnect');
      expect(result.current).toHaveProperty('send');

      // enabled=false 时不连接
      expect(result.current.isConnected).toBe(false);
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.reconnectCount).toBe(0);
    });

    it('should getConnectionStatus return disconnected when not connected', () => {
      const status = getConnectionStatus();
      expect(status).toBe('disconnected');
    });
  });
});
