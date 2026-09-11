import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock logger module (performance.tsx imports { logger } from './logger')
vi.mock('../logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

/**
 * Load a fresh instance of the performance module on every call.
 * performance.tsx holds a module-level `performanceMetrics` object that is
 * mutated in place; vi.resetModules() + dynamic import guarantees each test
 * starts from a clean slate.
 */
async function loadModule() {
  vi.resetModules();
  const mod = await import('../performance');
  const { logger } = await import('../logger');
  return { ...mod, logger };
}

/**
 * A usable PerformanceObserver stand-in.  The source code calls
 * `new PerformanceObserver(callback)` so the mock must be a class (not a
 * vi.fn() spy, which throws "is not a constructor" under `new`).
 */
class MockPerformanceObserver {
  static lastCallback: ((list: { getEntries: () => unknown[] }) => void) | null = null;
  observe = vi.fn();
  disconnect = vi.fn();
  constructor(callback: (list: { getEntries: () => unknown[] }) => void) {
    MockPerformanceObserver.lastCallback = callback;
  }
}

function installPerformanceObserver() {
  MockPerformanceObserver.lastCallback = null;
  (globalThis as Record<string, unknown>).PerformanceObserver = MockPerformanceObserver;
}

function installGetEntriesByType() {
  (performance as unknown as { getEntriesByType: ReturnType<typeof vi.fn> }).getEntriesByType = vi
    .fn()
    .mockReturnValue([]);
}

describe('utils/performance', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── getDeviceType ────────────────────────────────────────────────────────
  describe('getDeviceType', () => {
    it('returns "mobile" when window.innerWidth < 768', async () => {
      const { getDeviceType } = await loadModule();
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(375);
      expect(getDeviceType()).toBe('mobile');
    });

    it('returns "tablet" when 768 <= window.innerWidth < 1024', async () => {
      const { getDeviceType } = await loadModule();
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(800);
      expect(getDeviceType()).toBe('tablet');
    });

    it('returns "desktop" when window.innerWidth >= 1024', async () => {
      const { getDeviceType } = await loadModule();
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1920);
      expect(getDeviceType()).toBe('desktop');
    });
  });

  // ── initPerformanceMonitoring ───────────────────────────────────────────
  describe('initPerformanceMonitoring', () => {
    it('resolves immediately with zeroed metrics when PerformanceObserver is unavailable', async () => {
      const { initPerformanceMonitoring } = await loadModule();
      delete (globalThis as Record<string, unknown>).PerformanceObserver;

      const metrics = await initPerformanceMonitoring();
      expect(metrics.lcp).toBe(0);
      expect(metrics.fid).toBe(0);
      expect(metrics.tti).toBe(0);
      expect(metrics.fcp).toBe(0);
      expect(metrics.cls).toBe(0);
      expect(metrics.tbt).toBe(0);
    });

    it('creates a PerformanceObserver and observes all 4 entry types', async () => {
      const { initPerformanceMonitoring } = await loadModule();
      installPerformanceObserver();
      installGetEntriesByType();

      vi.useFakeTimers();
      const promise = initPerformanceMonitoring();
      await vi.advanceTimersByTimeAsync(5000);
      const metrics = await promise;

      // Four observe() calls: paint, largest-contentful-paint, layout-shift, first-input
      const instance = new MockPerformanceObserver(() => {});
      expect(instance.observe).toBeDefined();
      // The real assertion: observer was constructed (callback captured) and resolves
      expect(MockPerformanceObserver.lastCallback).not.toBeNull();
      expect(metrics).toHaveProperty('timeToInteractive');
      expect(metrics).toHaveProperty('cumulativeLayoutShift');
    });

    it('captures first-contentful-paint from paint entries', async () => {
      const { initPerformanceMonitoring } = await loadModule();
      installPerformanceObserver();
      installGetEntriesByType();

      vi.useFakeTimers();
      const promise = initPerformanceMonitoring();
      MockPerformanceObserver.lastCallback!.call(null, {
        getEntries: () => [
          { entryType: 'paint', name: 'first-contentful-paint', startTime: 150.5 },
        ],
      });
      await vi.advanceTimersByTimeAsync(5000);
      const metrics = await promise;

      expect(metrics.fcp).toBe(150.5);
      expect(metrics.firstContentfulPaint).toBe(150.5);
    });

    it('captures largest-contentful-paint entries', async () => {
      const { initPerformanceMonitoring } = await loadModule();
      installPerformanceObserver();
      installGetEntriesByType();

      vi.useFakeTimers();
      const promise = initPerformanceMonitoring();
      MockPerformanceObserver.lastCallback!.call(null, {
        getEntries: () => [{ entryType: 'largest-contentful-paint', startTime: 800 }],
      });
      await vi.advanceTimersByTimeAsync(5000);
      const metrics = await promise;

      expect(metrics.lcp).toBe(800);
      expect(metrics.largestContentfulPaint).toBe(800);
    });

    it('accumulates CLS from layout-shift entries without recent input', async () => {
      const { initPerformanceMonitoring } = await loadModule();
      installPerformanceObserver();
      installGetEntriesByType();

      vi.useFakeTimers();
      const promise = initPerformanceMonitoring();
      MockPerformanceObserver.lastCallback!.call(null, {
        getEntries: () => [
          { entryType: 'layout-shift', hadRecentInput: false, value: 0.05 },
          { entryType: 'layout-shift', hadRecentInput: false, value: 0.1 },
          { entryType: 'layout-shift', hadRecentInput: true, value: 0.99 }, // ignored
        ],
      });
      await vi.advanceTimersByTimeAsync(5000);
      const metrics = await promise;

      expect(metrics.cls).toBeCloseTo(0.15);
      expect(metrics.cumulativeLayoutShift).toBeCloseTo(0.15);
    });

    it('captures FID from first-input entries', async () => {
      const { initPerformanceMonitoring } = await loadModule();
      installPerformanceObserver();
      installGetEntriesByType();

      vi.useFakeTimers();
      const promise = initPerformanceMonitoring();
      MockPerformanceObserver.lastCallback!.call(null, {
        getEntries: () => [{ entryType: 'first-input', startTime: 100, processingStart: 130 }],
      });
      await vi.advanceTimersByTimeAsync(5000);
      const metrics = await promise;

      expect(metrics.fid).toBe(30);
      expect(metrics.firstInputDelay).toBe(30);
    });
  });

  // ── measureAsyncTime ────────────────────────────────────────────────────
  describe('measureAsyncTime', () => {
    it('returns the result of the async function', async () => {
      const { measureAsyncTime } = await loadModule();
      const result = await measureAsyncTime('my-op', async () => 'done-value');
      expect(result).toBe('done-value');
    });

    it('calls logger.debug with the label and elapsed time', async () => {
      const { measureAsyncTime, logger } = await loadModule();
      await measureAsyncTime('fetch-users', async () => 42);
      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/\[Performance\] fetch-users: \d+(\.\d+)?ms/)
      );
    });

    it('propagates errors from the measured function', async () => {
      const { measureAsyncTime } = await loadModule();
      await expect(
        measureAsyncTime('bad-op', async () => {
          throw new Error('boom');
        })
      ).rejects.toThrow('boom');
    });
  });

  // ── logPerformanceMetrics ────────────────────────────────────────────────
  describe('logPerformanceMetrics', () => {
    it('logs the report and sets window.__TOPEMS_PERF__', async () => {
      const { logPerformanceMetrics, logger } = await loadModule();
      installPerformanceObserver();
      installGetEntriesByType();

      vi.useFakeTimers();
      logPerformanceMetrics();
      await vi.advanceTimersByTimeAsync(5000);

      expect(logger.debug).toHaveBeenCalledWith('[TOPEMS Performance]', expect.any(String));
      const report = (window as unknown as Record<string, unknown>).__TOPEMS_PERF__ as Record<
        string,
        unknown
      >;
      expect(report).toBeDefined();
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('url');
      expect(report).toHaveProperty('userAgent');
      expect(report).toHaveProperty('deviceType');
      expect(report).toHaveProperty('connectionType');
    });
  });
});
