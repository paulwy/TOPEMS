import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GraphqlToRestFallback,
  CacheFallback,
  UIFallback,
  OfflineFallback,
  FallbackManager,
  FallbackLevel,
} from '../bff/fallbackStrategy';

vi.mock('@/utils/logger', () => ({
  logger: {
    child: () => ({ debug() {}, info() {}, warn() {}, error() {} }),
  },
}));
vi.mock('@/i18n', () => ({ default: { t: (k: string) => k } }));

const setOnline = (online: boolean) => {
  Object.defineProperty(navigator, 'onLine', { value: online, configurable: true });
};

beforeEach(() => setOnline(true));
afterEach(() => {
  setOnline(true);
  vi.restoreAllMocks();
});

// ==================== GraphqlToRestFallback.condition ====================

describe('GraphqlToRestFallback.condition', () => {
  const strat = new GraphqlToRestFallback(async () => 'rest-data');

  it('GraphQL / Network / Failed to fetch / Timeout 错误触发', () => {
    expect(strat.condition({ operationName: 'q', error: new Error('GraphQL syntax error') })).toBe(
      true
    );
    expect(strat.condition({ operationName: 'q', error: new Error('Failed to fetch') })).toBe(true);
    expect(strat.condition({ operationName: 'q', error: new Error('Request Timeout') })).toBe(true);
    expect(strat.condition({ operationName: 'q', error: 'Network down' })).toBe(true);
  });

  it('无错误或无关错误不触发', () => {
    expect(strat.condition({ operationName: 'q' })).toBe(false);
    expect(strat.condition({ operationName: 'q', error: new Error('validation failed') })).toBe(
      false
    );
  });
});

// ==================== CacheFallback.condition ====================

describe('CacheFallback.condition', () => {
  it('提供 cacheFn 时无条件触发', () => {
    const s = new CacheFallback(async () => 'cached');
    expect(s.condition({ operationName: 'q' })).toBe(true);
  });

  it('无 cacheFn 时依赖 cachedData 是否存在', () => {
    const s = new CacheFallback();
    expect(s.condition({ operationName: 'q', cachedData: [1, 2] })).toBe(true);
    expect(s.condition({ operationName: 'q', cachedData: null })).toBe(false);
    expect(s.condition({ operationName: 'q' })).toBe(false);
  });
});

// ==================== UIFallback / OfflineFallback ====================

describe('UIFallback.condition', () => {
  it('责任链末端恒为 true', () => {
    expect(new UIFallback({}).condition({ operationName: 'q' })).toBe(true);
  });
});

describe('OfflineFallback.condition', () => {
  it('离线 true，在线 false', () => {
    const s = new OfflineFallback(async () => 'local');
    setOnline(false);
    expect(s.condition({ operationName: 'q' })).toBe(true);
    setOnline(true);
    expect(s.condition({ operationName: 'q' })).toBe(false);
  });
});

// ==================== FallbackManager.getFallbackLevel ====================

describe('FallbackManager.getFallbackLevel', () => {
  const mgr = new FallbackManager();

  it('在线：无错误 PRIMARY，graphql SECONDARY，网络/超时 TERTIARY', () => {
    expect(mgr.getFallbackLevel(undefined)).toBe(FallbackLevel.PRIMARY);
    expect(mgr.getFallbackLevel(new Error('GraphQL error'))).toBe(FallbackLevel.SECONDARY);
    expect(mgr.getFallbackLevel(new Error('Failed to fetch'))).toBe(FallbackLevel.TERTIARY);
    expect(mgr.getFallbackLevel(new Error('other boom'))).toBe(FallbackLevel.TERTIARY);
  });

  it('离线优先返回 OFFLINE', () => {
    setOnline(false);
    expect(mgr.getFallbackLevel(new Error('GraphQL error'))).toBe(FallbackLevel.OFFLINE);
  });
});

// ==================== FallbackManager.getStrategies 排序 ====================

describe('FallbackManager.getStrategies 排序', () => {
  it('按级别升序，同级按 priority 降序', () => {
    const mgr = new FallbackManager();
    mgr.register({
      name: 'tertiary-low',
      level: FallbackLevel.TERTIARY,
      priority: 10,
      condition: () => false,
      action: async () => null,
    });
    mgr.register({
      name: 'secondary',
      level: FallbackLevel.SECONDARY,
      priority: 100,
      condition: () => false,
      action: async () => null,
    });
    mgr.register({
      name: 'tertiary-high',
      level: FallbackLevel.TERTIARY,
      priority: 90,
      condition: () => false,
      action: async () => null,
    });

    const order = mgr.getStrategies().map((s) => s.name);
    expect(order[0]).toBe('secondary');
    const tertiary = order.filter((n) => n.startsWith('tertiary'));
    expect(tertiary).toEqual(['tertiary-high', 'tertiary-low']);
  });
});
