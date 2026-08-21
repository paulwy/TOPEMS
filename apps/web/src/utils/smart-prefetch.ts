/**
 * V41.0 Track D: 智能预加载策略引擎
 *
 * 功能:
 * - 基于马尔可夫链的路由预测（一阶转移概率）
 * - 时间衰减权重（越新的访问权重越高）
 * - 多种预加载策略：route-based / pattern-based / time-based / user-behavior
 * - 预加载队列管理
 */

import { logger } from './logger';
import i18n from '@/i18n';

const prefetchLogger = logger.child({ prefix: 'SmartPrefetch' });

export type PrefetchStrategy = 'route-based' | 'pattern-based' | 'time-based' | 'user-behavior';

export interface RouteVisit {
  route: string;
  timestamp: number;
  duration: number;
}

export interface Prediction {
  route: string;
  confidence: number;
  priority: number;
}

export interface PrefetchTask {
  query: string;
  variables?: Record<string, unknown>;
  priority: number;
  status: 'pending' | 'loading' | 'done' | 'error';
  route?: string;
  createdAt: number;
}

interface TransitionCount {
  [toRoute: string]: number;
}

interface MarkovModel {
  transitions: Map<string, TransitionCount>;
  totalTransitions: Map<string, number>;
}

const TIME_DECAY_HALF_LIFE = 24 * 60 * 60 * 1000;
const MAX_HISTORY_SIZE = 500;
const MAX_PREDICTIONS = 5;
const MIN_CONFIDENCE = 0.1;
const MAX_PREFETCH_QUEUE_SIZE = 10;

export class PrefetchEngine {
  private visitHistory: RouteVisit[] = [];
  private markovModel: MarkovModel = {
    transitions: new Map(),
    totalTransitions: new Map(),
  };
  private prefetchQueue: PrefetchTask[] = [];
  private routeQueries: Map<string, Array<{ query: string; variables?: Record<string, unknown> }>> =
    new Map();
  private strategies: Set<PrefetchStrategy> = new Set(['route-based', 'user-behavior']);
  private lastRoute: string | null = null;

  constructor(strategies?: PrefetchStrategy[]) {
    if (strategies) {
      this.strategies = new Set(strategies);
    }
  }

  recordVisit(route: string, timestamp?: number, duration?: number): void {
    const ts = timestamp || Date.now();
    const dur = duration ?? 0;

    const visit: RouteVisit = { route, timestamp: ts, duration: dur };
    this.visitHistory.push(visit);

    if (this.visitHistory.length > MAX_HISTORY_SIZE) {
      this.visitHistory = this.visitHistory.slice(-MAX_HISTORY_SIZE);
    }

    if (this.lastRoute && this.lastRoute !== route) {
      this.recordTransition(this.lastRoute, route);
    }

    this.lastRoute = route;

    prefetchLogger.debug(`${i18n.t('shared.smart-prefetch.k0')}${route}`);
  }

  private recordTransition(from: string, to: string): void {
    const transitions = this.markovModel.transitions.get(from) || {};
    transitions[to] = (transitions[to] || 0) + 1;
    this.markovModel.transitions.set(from, transitions);

    const total = (this.markovModel.totalTransitions.get(from) || 0) + 1;
    this.markovModel.totalTransitions.set(from, total);
  }

  predictNextRoutes(currentRoute: string): Prediction[] {
    const predictions: Prediction[] = [];
    const now = Date.now();

    if (this.strategies.has('route-based') || this.strategies.has('user-behavior')) {
      const markovPredictions = this.predictFromMarkov(currentRoute);
      predictions.push(...markovPredictions);
    }

    if (this.strategies.has('pattern-based')) {
      const patternPredictions = this.predictFromPatterns(currentRoute);
      predictions.push(...patternPredictions);
    }

    if (this.strategies.has('time-based')) {
      const timePredictions = this.predictFromTime(currentRoute, now);
      predictions.push(...timePredictions);
    }

    const merged = this.mergePredictions(predictions);

    return merged
      .filter((p) => p.confidence >= MIN_CONFIDENCE)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, MAX_PREDICTIONS);
  }

  private predictFromMarkov(currentRoute: string): Prediction[] {
    const predictions: Prediction[] = [];
    const transitions = this.markovModel.transitions.get(currentRoute);
    const total = this.markovModel.totalTransitions.get(currentRoute) || 0;

    if (!transitions || total === 0) return predictions;

    for (const [route, count] of Object.entries(transitions)) {
      const confidence = count / total;
      const priority = confidence * 100;

      predictions.push({
        route,
        confidence,
        priority,
      });
    }

    return predictions;
  }

  private predictFromPatterns(currentRoute: string): Prediction[] {
    const predictions: Prediction[] = [];
    const now = Date.now();
    const recentVisits = this.visitHistory.filter(
      (v) => now - v.timestamp < TIME_DECAY_HALF_LIFE * 7
    );

    const routeAfterCurrent: Map<string, { count: number; weight: number }> = new Map();

    for (let i = 0; i < recentVisits.length - 1; i++) {
      if (recentVisits[i].route === currentRoute) {
        const nextRoute = recentVisits[i + 1].route;
        const age = now - recentVisits[i].timestamp;
        const weight = this.calculateTimeDecay(age);

        const existing = routeAfterCurrent.get(nextRoute) || { count: 0, weight: 0 };
        existing.count++;
        existing.weight += weight;
        routeAfterCurrent.set(nextRoute, existing);
      }
    }

    let totalWeight = 0;
    routeAfterCurrent.forEach((v) => {
      totalWeight += v.weight;
    });

    if (totalWeight === 0) return predictions;

    routeAfterCurrent.forEach((value, route) => {
      const confidence = value.weight / totalWeight;
      const priority = confidence * 100;
      predictions.push({ route, confidence, priority });
    });

    return predictions;
  }

  private predictFromTime(currentRoute: string, now: number): Prediction[] {
    const predictions: Prediction[] = [];
    const hourOfDay = new Date(now).getHours();
    const dayOfWeek = new Date(now).getDay();

    const sameTimeVisits = this.visitHistory.filter((v) => {
      const visitHour = new Date(v.timestamp).getHours();
      const visitDay = new Date(v.timestamp).getDay();
      return (
        Math.abs(visitHour - hourOfDay) <= 2 && visitDay === dayOfWeek && v.route !== currentRoute
      );
    });

    const routeFrequency: Map<string, number> = new Map();
    for (const visit of sameTimeVisits) {
      const count = routeFrequency.get(visit.route) || 0;
      routeFrequency.set(visit.route, count + 1);
    }

    const total = sameTimeVisits.length;
    if (total === 0) return predictions;

    routeFrequency.forEach((count, route) => {
      const confidence = count / total;
      const priority = confidence * 60;
      predictions.push({ route, confidence, priority });
    });

    return predictions;
  }

  private calculateTimeDecay(ageMs: number): number {
    const lambda = Math.log(2) / TIME_DECAY_HALF_LIFE;
    return Math.exp(-lambda * ageMs);
  }

  private mergePredictions(predictions: Prediction[]): Prediction[] {
    const merged: Map<string, Prediction> = new Map();

    for (const pred of predictions) {
      const existing = merged.get(pred.route);
      if (existing) {
        existing.confidence = Math.max(existing.confidence, pred.confidence);
        existing.priority = Math.max(existing.priority, pred.priority);
      } else {
        merged.set(pred.route, { ...pred });
      }
    }

    return Array.from(merged.values());
  }

  schedulePrefetch(routes: Prediction[]): PrefetchTask[] {
    const tasks: PrefetchTask[] = [];

    for (const route of routes) {
      const routeQueries = this.routeQueries.get(route.route);
      if (!routeQueries || routeQueries.length === 0) continue;

      for (const { query, variables } of routeQueries) {
        const task: PrefetchTask = {
          query,
          variables,
          priority: route.priority,
          status: 'pending',
          route: route.route,
          createdAt: Date.now(),
        };
        tasks.push(task);
      }
    }

    tasks.sort((a, b) => b.priority - a.priority);

    for (const task of tasks) {
      if (this.prefetchQueue.length >= MAX_PREFETCH_QUEUE_SIZE) break;

      const exists = this.prefetchQueue.some(
        (t) =>
          t.query === task.query && JSON.stringify(t.variables) === JSON.stringify(task.variables)
      );

      if (!exists) {
        this.prefetchQueue.push(task);
      }
    }

    prefetchLogger.info(
      `${i18n.t('shared.smart-prefetch.k1')}${tasks.length}${i18n.t('shared.smart-prefetch.k2')}${this.prefetchQueue.length}`
    );

    return tasks;
  }

  getPrefetchQueue(): PrefetchTask[] {
    return [...this.prefetchQueue];
  }

  updateTaskStatus(query: string, status: PrefetchTask['status']): void {
    const task = this.prefetchQueue.find((t) => t.query === query);
    if (task) {
      task.status = status;
    }
  }

  clearCompletedTasks(): void {
    this.prefetchQueue = this.prefetchQueue.filter(
      (t) => t.status === 'pending' || t.status === 'loading'
    );
  }

  registerRouteQueries(
    route: string,
    queries: Array<{ query: string; variables?: Record<string, unknown> }>
  ): void {
    this.routeQueries.set(route, queries);
    prefetchLogger.debug(
      `${i18n.t('shared.smart-prefetch.k3')}${route} (${queries.length}${i18n.t('shared.smart-prefetch.k4')}`
    );
  }

  getRouteQueries(route: string): Array<{ query: string; variables?: Record<string, unknown> }> {
    return this.routeQueries.get(route) || [];
  }

  getVisitHistory(): RouteVisit[] {
    return [...this.visitHistory];
  }

  clearHistory(): void {
    this.visitHistory = [];
    this.markovModel = {
      transitions: new Map(),
      totalTransitions: new Map(),
    };
    this.lastRoute = null;
    this.prefetchQueue = [];
    prefetchLogger.info(i18n.t('shared.smart-prefetch.k0'));
  }

  setStrategies(strategies: PrefetchStrategy[]): void {
    this.strategies = new Set(strategies);
  }

  getStrategies(): PrefetchStrategy[] {
    return Array.from(this.strategies);
  }
}

let globalPrefetchEngine: PrefetchEngine | null = null;

function getPrefetchEngine(): PrefetchEngine {
  if (!globalPrefetchEngine) {
    globalPrefetchEngine = new PrefetchEngine();
  }
  return globalPrefetchEngine;
}

export default PrefetchEngine;
