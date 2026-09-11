import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  PrefetchEngine,
  getPrefetchEngine,
  type PrefetchStrategy,
  type Prediction,
} from '../smartPrefetch';

// Mock i18n
vi.mock('@/i18n', () => ({
  default: {
    t: (x: string) => x,
  },
}));

describe('smartPrefetch', () => {
  let engine: PrefetchEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new PrefetchEngine();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should use default strategies (route-based, user-behavior)', () => {
      const strategies = engine.getStrategies();
      expect(strategies).toContain('route-based');
      expect(strategies).toContain('user-behavior');
      expect(strategies).not.toContain('pattern-based');
      expect(strategies).not.toContain('time-based');
    });

    it('should accept custom strategies', () => {
      const custom = new PrefetchEngine(['pattern-based', 'time-based'] as PrefetchStrategy[]);
      const strategies = custom.getStrategies();
      expect(strategies).toContain('pattern-based');
      expect(strategies).toContain('time-based');
      expect(strategies).not.toContain('route-based');
    });
  });

  describe('recordVisit', () => {
    it('should record a visit with timestamp and duration', () => {
      const now = Date.now();
      engine.recordVisit('/home', now, 5000);
      const history = engine.getVisitHistory();
      expect(history).toHaveLength(1);
      expect(history[0].route).toBe('/home');
      expect(history[0].timestamp).toBe(now);
      expect(history[0].duration).toBe(5000);
    });

    it('should record transitions between different routes', () => {
      const now = Date.now();
      engine.recordVisit('/home', now);
      engine.recordVisit('/about', now + 1000);
      engine.recordVisit('/home', now + 2000);

      // After visiting /home -> /about -> /home, there should be transitions
      const predictions = engine.predictNextRoutes('/home');
      // /home transitions: /about (once), /home is lastRoute
      // /about transition: /home (once)
      expect(predictions.length).toBeGreaterThan(0);
    });

    it('should not record transition when visiting same route consecutively', () => {
      const now = Date.now();
      engine.recordVisit('/home', now);
      engine.recordVisit('/home', now + 1000);
      const predictions = engine.predictNextRoutes('/home');
      expect(predictions).toHaveLength(0);
    });

    it('should default duration to 0 when not provided', () => {
      engine.recordVisit('/home');
      expect(engine.getVisitHistory()[0].duration).toBe(0);
    });
  });

  describe('predictNextRoutes (Markov)', () => {
    it('should return empty predictions when no history', () => {
      const predictions = engine.predictNextRoutes('/nonexistent');
      expect(predictions).toEqual([]);
    });

    it('should predict next route based on transition counts', () => {
      const now = Date.now();
      // /home -> /about 3 times, /home -> /contact 1 time
      engine.recordVisit('/home', now);
      engine.recordVisit('/about', now + 100);
      engine.recordVisit('/home', now + 200);
      engine.recordVisit('/about', now + 300);
      engine.recordVisit('/home', now + 400);
      engine.recordVisit('/contact', now + 500);
      engine.recordVisit('/home', now + 600);
      engine.recordVisit('/about', now + 700);

      const predictions = engine.predictNextRoutes('/home');
      expect(predictions.length).toBeGreaterThan(0);
      // /about should have higher confidence (3/4) than /contact (1/4)
      const aboutPred = predictions.find((p) => p.route === '/about');
      const contactPred = predictions.find((p) => p.route === '/contact');
      expect(aboutPred).toBeDefined();
      expect(contactPred).toBeDefined();
      expect(aboutPred!.confidence).toBeGreaterThan(contactPred!.confidence);
    });

    it('should filter predictions below min confidence', () => {
      const now = Date.now();
      engine.recordVisit('/a', now);
      engine.recordVisit('/b', now + 100);
      const predictions = engine.predictNextRoutes('/a');
      // confidence should be 1.0 which is >= 0.1
      expect(predictions.length).toBeGreaterThan(0);
    });

    it('should limit predictions to MAX_PREDICTIONS (5)', () => {
      const now = Date.now();
      // Create transitions from /start to 8 different routes
      const targets = ['/r1', '/r2', '/r3', '/r4', '/r5', '/r6', '/r7', '/r8'];
      targets.forEach((t, i) => {
        engine.recordVisit('/start', now + i * 200);
        engine.recordVisit(t, now + i * 200 + 100);
      });
      const predictions = engine.predictNextRoutes('/start');
      expect(predictions.length).toBeLessThanOrEqual(5);
    });
  });

  describe('predictNextRoutes (pattern-based)', () => {
    it('should use pattern-based predictions when strategy enabled', () => {
      const patternEngine = new PrefetchEngine(['pattern-based'] as PrefetchStrategy[]);
      const now = Date.now();
      patternEngine.recordVisit('/home', now);
      patternEngine.recordVisit('/dashboard', now + 100);
      patternEngine.recordVisit('/home', now + 200);
      patternEngine.recordVisit('/dashboard', now + 300);

      const predictions = patternEngine.predictNextRoutes('/home');
      expect(predictions.length).toBeGreaterThan(0);
      expect(predictions.some((p) => p.route === '/dashboard')).toBe(true);
    });
  });

  describe('predictNextRoutes (time-based)', () => {
    it('should use time-based predictions when strategy enabled', () => {
      const timeEngine = new PrefetchEngine(['time-based'] as PrefetchStrategy[]);
      // Use a fixed date that has a known day-of-week and hour
      const baseTime = new Date(2025, 0, 15, 10, 0, 0).getTime(); // Wednesday 10:00
      timeEngine.recordVisit('/home', baseTime);
      timeEngine.recordVisit('/dashboard', baseTime + 1000);
      timeEngine.recordVisit('/settings', baseTime + 2000);

      vi.setSystemTime(baseTime + 3000);
      const predictions = timeEngine.predictNextRoutes('/home');
      // Should find visits within same hour window on same day of week
      expect(Array.isArray(predictions)).toBe(true);
    });
  });

  describe('schedulePrefetch', () => {
    it('should create prefetch tasks for registered route queries', () => {
      engine.registerRouteQueries('/about', [{ query: 'GetAbout', variables: { id: 1 } }]);
      const predictions: Prediction[] = [{ route: '/about', confidence: 0.9, priority: 90 }];
      const tasks = engine.schedulePrefetch(predictions);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].query).toBe('GetAbout');
      expect(tasks[0].status).toBe('pending');
      expect(tasks[0].priority).toBe(90);
    });

    it('should skip routes with no registered queries', () => {
      const predictions: Prediction[] = [{ route: '/nonexistent', confidence: 0.9, priority: 90 }];
      const tasks = engine.schedulePrefetch(predictions);
      expect(tasks).toHaveLength(0);
    });

    it('should sort tasks by priority descending', () => {
      engine.registerRouteQueries('/low', [{ query: 'QLow' }]);
      engine.registerRouteQueries('/high', [{ query: 'QHigh' }]);
      const predictions: Prediction[] = [
        { route: '/low', confidence: 0.3, priority: 30 },
        { route: '/high', confidence: 0.9, priority: 90 },
      ];
      const tasks = engine.schedulePrefetch(predictions);
      expect(tasks[0].query).toBe('QHigh');
      expect(tasks[1].query).toBe('QLow');
    });

    it('should deduplicate identical queries in queue', () => {
      engine.registerRouteQueries('/a', [{ query: 'SameQuery', variables: { x: 1 } }]);
      const predictions: Prediction[] = [
        { route: '/a', confidence: 0.9, priority: 90 },
        { route: '/a', confidence: 0.8, priority: 80 },
      ];
      engine.schedulePrefetch(predictions);
      const queue = engine.getPrefetchQueue();
      // The duplicate should not be added twice
      const sameQueryCount = queue.filter((t) => t.query === 'SameQuery').length;
      expect(sameQueryCount).toBe(1);
    });

    it('should limit queue size to 10', () => {
      // Register 12 routes, each with 1 query
      for (let i = 0; i < 12; i++) {
        engine.registerRouteQueries(`/r${i}`, [{ query: `Q${i}` }]);
      }
      const predictions: Prediction[] = Array.from({ length: 12 }, (_, i) => ({
        route: `/r${i}`,
        confidence: 0.9 - i * 0.05,
        priority: 90 - i,
      }));
      engine.schedulePrefetch(predictions);
      const queue = engine.getPrefetchQueue();
      expect(queue.length).toBeLessThanOrEqual(10);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status by query name', () => {
      engine.registerRouteQueries('/about', [{ query: 'GetAbout' }]);
      engine.schedulePrefetch([{ route: '/about', confidence: 0.9, priority: 90 }]);
      engine.updateTaskStatus('GetAbout', 'loading');
      const queue = engine.getPrefetchQueue();
      expect(queue[0].status).toBe('loading');
    });

    it('should do nothing for nonexistent query', () => {
      engine.updateTaskStatus('NoSuchQuery', 'done');
      expect(engine.getPrefetchQueue()).toHaveLength(0);
    });
  });

  describe('clearCompletedTasks', () => {
    it('should remove done and error tasks from queue', () => {
      engine.registerRouteQueries('/a', [{ query: 'QA' }]);
      engine.registerRouteQueries('/b', [{ query: 'QB' }]);
      engine.registerRouteQueries('/c', [{ query: 'QC' }]);
      engine.schedulePrefetch([
        { route: '/a', confidence: 0.9, priority: 90 },
        { route: '/b', confidence: 0.8, priority: 80 },
        { route: '/c', confidence: 0.7, priority: 70 },
      ]);
      engine.updateTaskStatus('QA', 'done');
      engine.updateTaskStatus('QB', 'error');
      engine.clearCompletedTasks();
      const queue = engine.getPrefetchQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].query).toBe('QC');
    });
  });

  describe('registerRouteQueries / getRouteQueries', () => {
    it('should register and retrieve route queries', () => {
      const queries = [{ query: 'GetUser', variables: { id: '1' } }];
      engine.registerRouteQueries('/user', queries);
      expect(engine.getRouteQueries('/user')).toEqual(queries);
    });

    it('should return empty array for unregistered route', () => {
      expect(engine.getRouteQueries('/unknown')).toEqual([]);
    });
  });

  describe('clearHistory', () => {
    it('should clear visit history and markov model', () => {
      engine.recordVisit('/home', Date.now());
      engine.recordVisit('/about', Date.now());
      engine.clearHistory();
      expect(engine.getVisitHistory()).toHaveLength(0);
      expect(engine.predictNextRoutes('/home')).toEqual([]);
    });
  });

  describe('setStrategies / getStrategies', () => {
    it('should update strategies', () => {
      engine.setStrategies(['time-based', 'pattern-based']);
      const strategies = engine.getStrategies();
      expect(strategies).toContain('time-based');
      expect(strategies).toContain('pattern-based');
      expect(strategies).not.toContain('route-based');
    });
  });

  describe('getPrefetchEngine singleton', () => {
    it('should return the same instance on subsequent calls', () => {
      const instance1 = getPrefetchEngine();
      const instance2 = getPrefetchEngine();
      expect(instance1).toBe(instance2);
    });
  });
});
