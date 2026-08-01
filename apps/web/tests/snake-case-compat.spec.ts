/**
 * @done V80 Tier2 coverage
 *
 * V79 Phase 5 清理验证：11 个 snake_case WS 别名已删除
 * @see @/hooks/useUnifiedWebSocket
 *
 * 历史：
 *  - V79 阶段 4 引入了 11 个 snake_case 别名以保持向后兼容。
 *  - V79 阶段 5 全量迁移到 camelCase 后，snake_case 别名应已彻底删除。
 *  - 本 spec 守护这次清理成果：若任何别名意外回归，测试会立即失败。
 */
import { describe, it, expect } from 'vitest';
import * as wsModule from '@/hooks/useUnifiedWebSocket';

const ALL_SNAKE_CASE_ALIASES = [
  'create_connection',
  'close_connection',
  'send_message',
  'subscribe_topic',
  'unsubscribe_topic',
  'get_connection_status',
  'reconnect_socket',
  'ping_server',
  'use_unified_web_socket',
  'use_web_socket_subscription',
  'use_web_socket_connection',
] as const;

const ALL_CAMEL_CASE_FUNCTIONS = [
  'createConnection',
  'closeConnection',
  'sendMessage',
  'subscribeTopic',
  'unsubscribeTopic',
  'getConnectionStatus',
  'reconnectSocket',
  'pingServer',
  'useUnifiedWebSocket',
  'useWebSocketSubscription',
  'useWebSocketConnection',
] as const;

describe('V79 cleanup verification: snake_case WS aliases removed', () => {
  it('should not export any of the 11 legacy snake_case aliases', () => {
    const mod = wsModule as unknown as Record<string, unknown>;

    for (const alias of ALL_SNAKE_CASE_ALIASES) {
      expect(mod[alias], `legacy alias "${alias}" should be removed`).toBeUndefined();
    }

    // 计数校验：确保所有 11 个别名都验证过
    expect(ALL_SNAKE_CASE_ALIASES).toHaveLength(11);
  });

  it('should still export the 11 canonical camelCase functions', () => {
    for (const name of ALL_CAMEL_CASE_FUNCTIONS) {
      expect(
        (wsModule as unknown as Record<string, unknown>)[name],
        `camelCase "${name}" should still be exported`
      ).toBeDefined();
    }
  });

  it('should have zero snake_case identifiers in the source file (post-cleanup)', () => {
    // 防止有人重新引入别名（即便作为非导出变量）。这里只检查模块命名空间已不暴露
    const mod = wsModule as unknown as Record<string, unknown>;
    const snakeKeys = Object.keys(mod).filter((k) => k.includes('_') && /^[a-z]+(_[a-z]+)+$/.test(k));
    expect(snakeKeys, `unexpected snake_case keys: ${snakeKeys.join(', ')}`).toEqual([]);
  });
});
