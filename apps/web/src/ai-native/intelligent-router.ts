export type RoutingStrategy = 'intent-based' | 'performance-based' | 'hybrid' | 'a/b-test';

export interface RouteRecommendation {
  path: string;
  confidence: number;
  reason: string;
  alternatives: Array<{
    path: string;
    confidence: number;
    tradeoff: string;
  }>;
  predicted_latency_ms: number;
  ab_test_variant?: string;
}

export interface RouteIntent {
  action: string;
  target: string;
  context: string[];
  urgency: 'low' | 'normal' | 'high' | 'critical';
}

export interface RoutePerformance {
  path: string;
  avg_latency_ms: number;
  p95_latency_ms: number;
  error_rate: number;
  cache_hit_rate: number;
  last_updated: number;
}

export interface BehaviorEntry {
  path: string;
  timestamp: number;
  duration_ms: number;
  user_action: string;
  conversion: boolean;
}

export interface RouterStats {
  total_recommendations: number;
  accepted_recommendations: number;
  acceptance_rate: number;
  avg_confidence: number;
  by_strategy: Record<RoutingStrategy, number>;
  top_routes: Array<{ path: string; count: number; avg_confidence: number }>;
  performance: RoutePerformance[];
  ab_tests: Array<{
    test_id: string;
    variants: Array<{ variant: string; traffic: number; conversions: number }>;
  }>;
}

const DEFAULT_STRATEGY: RoutingStrategy = 'hybrid';
const HISTORY_LIMIT = 1000;

const INTENT_PATH_MAP: Record<string, string[]> = {
  dashboard: ['/dashboard', '/home', '/overview'],
  analytics: ['/bi/analytics', '/bi/dashboard', '/bi/report'],
  customer: ['/crm/customers', '/crm/dashboard', '/crm/opportunities'],
  order: ['/scm/orders', '/scm/dashboard', '/scm/mrp-plan'],
  product: ['/pdm/products', '/pdm/bom', '/pdm/project'],
  employee: ['/hrm/employees', '/hrm/dashboard', '/hrm/attendance'],
  finance: ['/erp/finance', '/erp/dashboard', '/erp/sales-order'],
  inventory: ['/wms/inventory', '/wms/dashboard', '/wms/inbound'],
  quality: ['/qms/dashboard', '/qms/spc', '/qms/audit'],
  workflow: ['/workflow/tasks', '/workflow/instances', '/workflow/definitions'],
  ai: ['/ai/chat', '/ai/dashboard', '/ai/assistant'],
  settings: ['/admin/monitor', '/admin/audit-log', '/system/params'],
};

const PERFORMANCE_PROFILES: Record<string, RoutePerformance> = {
  '/dashboard': { path: '/dashboard', avg_latency_ms: 120, p95_latency_ms: 280, error_rate: 0.002, cache_hit_rate: 0.85, last_updated: Date.now() },
  '/bi/analytics': { path: '/bi/analytics', avg_latency_ms: 350, p95_latency_ms: 800, error_rate: 0.01, cache_hit_rate: 0.6, last_updated: Date.now() },
  '/crm/customers': { path: '/crm/customers', avg_latency_ms: 200, p95_latency_ms: 450, error_rate: 0.005, cache_hit_rate: 0.75, last_updated: Date.now() },
  '/scm/orders': { path: '/scm/orders', avg_latency_ms: 180, p95_latency_ms: 400, error_rate: 0.008, cache_hit_rate: 0.7, last_updated: Date.now() },
  '/pdm/products': { path: '/pdm/products', avg_latency_ms: 150, p95_latency_ms: 350, error_rate: 0.003, cache_hit_rate: 0.8, last_updated: Date.now() },
  '/hrm/employees': { path: '/hrm/employees', avg_latency_ms: 130, p95_latency_ms: 300, error_rate: 0.004, cache_hit_rate: 0.82, last_updated: Date.now() },
  '/erp/finance': { path: '/erp/finance', avg_latency_ms: 220, p95_latency_ms: 500, error_rate: 0.006, cache_hit_rate: 0.72, last_updated: Date.now() },
  '/wms/inventory': { path: '/wms/inventory', avg_latency_ms: 160, p95_latency_ms: 380, error_rate: 0.007, cache_hit_rate: 0.78, last_updated: Date.now() },
  '/qms/dashboard': { path: '/qms/dashboard', avg_latency_ms: 190, p95_latency_ms: 420, error_rate: 0.005, cache_hit_rate: 0.76, last_updated: Date.now() },
  '/workflow/tasks': { path: '/workflow/tasks', avg_latency_ms: 140, p95_latency_ms: 320, error_rate: 0.003, cache_hit_rate: 0.83, last_updated: Date.now() },
  '/ai/chat': { path: '/ai/chat', avg_latency_ms: 80, p95_latency_ms: 180, error_rate: 0.001, cache_hit_rate: 0.9, last_updated: Date.now() },
  '/admin/monitor': { path: '/admin/monitor', avg_latency_ms: 250, p95_latency_ms: 550, error_rate: 0.012, cache_hit_rate: 0.55, last_updated: Date.now() },
};

class IntelligentRouterImpl {
  private strategy: RoutingStrategy;
  private history: BehaviorEntry[];
  private recommendations: Map<string, RouteRecommendation[]>;
  private abTests: Map<string, { variants: Array<{ variant: string; traffic: number; conversions: number }> }>;
  private performanceProfiles: Map<string, RoutePerformance>;
  private recommendationCount: number;
  private acceptanceCount: number;
  private confidenceSum: number;
  private strategyCounts: Record<RoutingStrategy, number>;
  private learnedPaths: Map<string, { count: number; avgConfidence: number }>;

  constructor() {
    this.strategy = DEFAULT_STRATEGY;
    this.history = [];
    this.recommendations = new Map();
    this.abTests = new Map();
    this.performanceProfiles = new Map(Object.entries(PERFORMANCE_PROFILES));
    this.recommendationCount = 0;
    this.acceptanceCount = 0;
    this.confidenceSum = 0;
    this.strategyCounts = {
      'intent-based': 0,
      'performance-based': 0,
      hybrid: 0,
      'a/b-test': 0,
    };
    this.learnedPaths = new Map();
  }

  setStrategy(strategy: RoutingStrategy): void {
    this.strategy = strategy;
  }

  getStrategy(): RoutingStrategy {
    return this.strategy;
  }

  recommendRoute(intent: string | RouteIntent, context?: { device?: string; network?: string; location?: string }): RouteRecommendation {
    const query = typeof intent === 'string' ? intent : `${intent.action} ${intent.target} ${intent.context.join(' ')}`;
    const intentLower = query.toLowerCase();

    this.strategyCounts[this.strategy]++;

    if (this.strategy === 'intent-based') {
      return this.intentBasedRecommendation(intentLower);
    }
    if (this.strategy === 'performance-based') {
      return this.performanceBasedRecommendation();
    }
    if (this.strategy === 'a/b-test') {
      return this.abTestRecommendation();
    }

    return this.hybridRecommendation(intentLower);
  }

  private intentBasedRecommendation(intent: string): RouteRecommendation {
    let bestPath = '/dashboard';
    let bestConfidence = 0.3;
    let bestReason = '默认路由';

    for (const [key, paths] of Object.entries(INTENT_PATH_MAP)) {
      if (intent.includes(key)) {
        bestPath = paths[0];
        bestConfidence = 0.85;
        bestReason = `匹配意图 "${key}"`;
        break;
      }
    }

    const learned = this.learnedPaths.get(bestPath);
    if (learned && learned.count > 5) {
      bestConfidence = Math.min(0.99, learned.avgConfidence * 0.7 + bestConfidence * 0.3);
      bestReason += ` (基于 ${learned.count} 次历史行为)`;
    }

    const alternatives = this.generateAlternatives(bestPath, intent);
    const perf = this.performanceProfiles.get(bestPath);

    return {
      path: bestPath,
      confidence: bestConfidence,
      reason: bestReason,
      alternatives,
      predicted_latency_ms: perf?.avg_latency_ms ?? 200,
    };
  }

  private performanceBasedRecommendation(): RouteRecommendation {
    let bestPath = '/dashboard';
    let bestScore = Infinity;

    for (const [path, perf] of this.performanceProfiles) {
      const score = perf.avg_latency_ms + perf.error_rate * 1000;
      if (score < bestScore) {
        bestScore = score;
        bestPath = path;
      }
    }

    const perf = this.performanceProfiles.get(bestPath);

    return {
      path: bestPath,
      confidence: 0.95,
      reason: `基于性能最优策略 (延迟: ${perf?.avg_latency_ms ?? 0}ms)`,
      alternatives: this.generateAlternatives(bestPath, ''),
      predicted_latency_ms: perf?.avg_latency_ms ?? 200,
    };
  }

  private hybridRecommendation(intent: string): RouteRecommendation {
    const intentRec = this.intentBasedRecommendation(intent);
    const perfRec = this.performanceBasedRecommendation();

    if (intentRec.confidence > 0.7) {
      return {
        ...intentRec,
        reason: `混合策略 - ${intentRec.reason}`,
      };
    }

    return {
      ...perfRec,
      reason: `混合策略 - ${perfRec.reason} (意图置信度低，回退到性能优先)`,
    };
  }

  private abTestRecommendation(): RouteRecommendation {
    const testId = 'main-nav-test';
    let abTest = this.abTests.get(testId);

    if (!abTest) {
      abTest = {
        variants: [
          { variant: 'control', traffic: 0.5, conversions: 0 },
          { variant: 'treatment-a', traffic: 0.3, conversions: 0 },
          { variant: 'treatment-b', traffic: 0.2, conversions: 0 },
        ],
      };
      this.abTests.set(testId, abTest);
    }

    const rand = Math.random();
    let cumulative = 0;
    let selectedVariant = abTest.variants[0].variant;
    for (const v of abTest.variants) {
      cumulative += v.traffic;
      if (rand <= cumulative) {
        selectedVariant = v.variant;
        break;
      }
    }

    const variantPaths: Record<string, string> = {
      control: '/dashboard',
      'treatment-a': '/bi/analytics',
      'treatment-b': '/ai/dashboard',
    };

    const path = variantPaths[selectedVariant] ?? '/dashboard';
    const perf = this.performanceProfiles.get(path);

    return {
      path,
      confidence: 0.6,
      reason: `A/B 测试分配: ${selectedVariant}`,
      alternatives: this.generateAlternatives(path, ''),
      predicted_latency_ms: perf?.avg_latency_ms ?? 200,
      ab_test_variant: selectedVariant,
    };
  }

  private generateAlternatives(primaryPath: string, intent: string): RouteRecommendation['alternatives'] {
    const result: RouteRecommendation['alternatives'] = [];
    const allPaths = Array.from(this.performanceProfiles.keys()).filter((p) => p !== primaryPath);

    for (const path of allPaths.slice(0, 3)) {
      const perf = this.performanceProfiles.get(path);
      const latency = perf?.avg_latency_ms ?? 200;
      result.push({
        path,
        confidence: Math.max(0.2, 0.5 - latency / 2000),
        tradeoff: `延迟 ${latency}ms`,
      });
    }

    return result;
  }

  learnFromBehavior(entry: BehaviorEntry): void {
    this.history.push(entry);
    if (this.history.length > HISTORY_LIMIT) {
      this.history = this.history.slice(-HISTORY_LIMIT);
    }

    const existing = this.learnedPaths.get(entry.path);
    if (existing) {
      const newCount = existing.count + 1;
      existing.avgConfidence = (existing.avgConfidence * existing.count + (entry.conversion ? 0.9 : 0.5)) / newCount;
      existing.count = newCount;
    } else {
      this.learnedPaths.set(entry.path, {
        count: 1,
        avgConfidence: entry.conversion ? 0.9 : 0.5,
      });
    }

    const perf = this.performanceProfiles.get(entry.path);
    if (perf) {
      const newAvg = (perf.avg_latency_ms * 0.8 + entry.duration_ms * 0.2);
      this.performanceProfiles.set(entry.path, {
        ...perf,
        avg_latency_ms: Math.round(newAvg),
        last_updated: Date.now(),
      });
    }
  }

  recordRecommendation(accepted: boolean, confidence: number, path: string): void {
    this.recommendationCount++;
    this.confidenceSum += confidence;
    if (accepted) {
      this.acceptanceCount++;
      const learned = this.learnedPaths.get(path);
      if (learned) {
        learned.count++;
        learned.avgConfidence = (learned.avgConfidence * (learned.count - 1) + confidence) / learned.count;
      }
    }
  }

  getRouteStats(): RouterStats {
    const topRoutes = Array.from(this.learnedPaths.entries())
      .map(([path, data]) => ({
        path,
        count: data.count,
        avg_confidence: data.avgConfidence,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total_recommendations: this.recommendationCount,
      accepted_recommendations: this.acceptanceCount,
      acceptance_rate: this.recommendationCount > 0 ? this.acceptanceCount / this.recommendationCount : 0,
      avg_confidence: this.recommendationCount > 0 ? this.confidenceSum / this.recommendationCount : 0,
      by_strategy: { ...this.strategyCounts },
      top_routes: topRoutes,
      performance: Array.from(this.performanceProfiles.values()),
      ab_tests: Array.from(this.abTests.entries()).map(([test_id, data]) => ({
        test_id,
        variants: data.variants,
      })),
    };
  }

  addPerformanceProfile(perf: RoutePerformance): void {
    this.performanceProfiles.set(perf.path, perf);
  }

  getHistory(limit: number = 50): BehaviorEntry[] {
    return this.history.slice(-limit);
  }

  predictPrefetch(intent: string): string[] {
    const rec = this.recommendRoute(intent);
    const pathsToPrefetch = [rec.path, ...rec.alternatives.map((a) => a.path)];
    return pathsToPrefetch;
  }

  reset(): void {
    this.history = [];
    this.recommendations.clear();
    this.abTests.clear();
    this.recommendationCount = 0;
    this.acceptanceCount = 0;
    this.confidenceSum = 0;
    this.strategyCounts = {
      'intent-based': 0,
      'performance-based': 0,
      hybrid: 0,
      'a/b-test': 0,
    };
    this.learnedPaths.clear();
    this.strategy = DEFAULT_STRATEGY;
    this.performanceProfiles = new Map(Object.entries(PERFORMANCE_PROFILES));
  }
}

export const intelligentRouter = new IntelligentRouterImpl();
export const IntelligentRouter = IntelligentRouterImpl;

export default intelligentRouter;