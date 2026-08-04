/**
 * V48.0 智能路由推荐 — 基于用户行为、模块依赖、性能指标的智能路由推荐引擎
 *
 * 核心能力:
 * - 用户行为画像采集与分析
 * - 导航模式识别与转移概率计算
 * - 基于上下文的路由推荐（行为/性能/上下文/混合策略）
 * - 下一步路由预测与预加载
 * - 路由顺序优化
 */

// ==================== 枚举 ====================

export enum RecommendationStrategy {
  BEHAVIORBASED = 'behavior-based',
  PERFORMANCEBASED = 'performance-based',
  CONTEXTBASED = 'context-based',
  HYBRID = 'hybrid',
}

// ==================== 接口 ====================

export interface NavigationPattern {
  from_route: string;
  to_route: string;
  frequency: number;
  avg_time_spent: number;
  transition_probability: number;
}

export interface UserBehaviorProfile {
  user_id: string;
  frequent_routes: string[];
  avg_session_duration: number;
  preferred_modules: string[];
  navigation_patterns: NavigationPattern[];
  time_of_day_patterns: Record<string, string[]>;
  last_active: number;
  total_sessions: number;
}

export interface RouteMetrics {
  route_path: string;
  avg_load_time: number;
  error_rate: number;
  usage_count: number;
  last_used: number;
  performance_score: number;
}

export interface RouteRecommendation {
  target_route: string;
  confidence: number;
  reason: string;
  estimated_load_time: number;
  user_intent: string;
  alternative_routes: string[];
}

export interface SmartRouterConfig {
  maxHistorySize: number;
  minSamplesForPrediction: number;
  defaultConfidenceThreshold: number;
  maxRecommendations: number;
  preloadTopN: number;
  performanceScoreWeights: {
    loadTime: number;
    errorRate: number;
    usage: number;
  };
  strategy: RecommendationStrategy;
}

export interface SmartRouterStats {
  total_users_tracked: number;
  total_routes_tracked: number;
  total_navigations_recorded: number;
  avg_prediction_accuracy: number;
  top_recommended_routes: string[];
  active_strategy: RecommendationStrategy;
  cache_hit_rate: number;
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: SmartRouterConfig = {
  maxHistorySize: 1000,
  minSamplesForPrediction: 5,
  defaultConfidenceThreshold: 0.5,
  maxRecommendations: 5,
  preloadTopN: 3,
  performanceScoreWeights: {
    loadTime: 0.4,
    errorRate: 0.4,
    usage: 0.2,
  },
  strategy: RecommendationStrategy.HYBRID,
};

// ==================== 导航记录内部结构 ====================

interface NavigationRecord {
  user_id: string;
  from_route: string;
  to_route: string;
  timestamp: number;
  time_spent: number;
  session_id: string;
}

interface RoutePerformanceRecord {
  route_path: string;
  load_time: number;
  error: boolean;
  timestamp: number;
}

// ==================== SmartRouter 类 ====================

export class SmartRouter {
  private config: SmartRouterConfig;
  private navigationHistory: NavigationRecord[] = [];
  private userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private routeMetrics: Map<string, RouteMetrics> = new Map();
  private routePerformanceLog: Map<string, RoutePerformanceRecord[]> = new Map();
  private preloadedRoutes: Set<string> = new Set();
  private predictionStats: { correct: number; total: number } = { correct: 0, total: 0 };

  constructor(config: Partial<SmartRouterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ------------------- 记录导航行为 -------------------

  recordNavigation(
    userId: string,
    fromRoute: string,
    toRoute: string,
    timeSpent: number,
    sessionId: string,
    loadTime?: number,
    error?: boolean
  ): void {
    const record: NavigationRecord = {
      user_id: userId,
      from_route: fromRoute,
      to_route: toRoute,
      timestamp: Date.now(),
      time_spent: timeSpent,
      session_id: sessionId,
    };

    this.navigationHistory.unshift(record);
    if (this.navigationHistory.length > this.config.maxHistorySize) {
      this.navigationHistory.pop();
    }

    this.updateUserProfile(userId, fromRoute, toRoute, timeSpent);
    this.updateRouteUsage(toRoute);

    if (loadTime !== undefined) {
      this.recordRoutePerformance(toRoute, loadTime, error ?? false);
    }
  }

  // ------------------- 分析导航模式 -------------------

  analyzePatterns(userId?: string): NavigationPattern[] {
    const records = userId
      ? this.navigationHistory.filter((r) => r.user_id === userId)
      : this.navigationHistory;

    const patternMap = new Map<string, NavigationPattern>();
    const fromCounts = new Map<string, number>();

    for (const r of records) {
      const fromKey = r.from_route;
      fromCounts.set(fromKey, (fromCounts.get(fromKey) || 0) + 1);
    }

    for (const r of records) {
      const key = `${r.from_route}->${r.to_route}`;
      const existing = patternMap.get(key);
      if (existing) {
        existing.frequency += 1;
        existing.avg_time_spent =
          (existing.avg_time_spent * (existing.frequency - 1) + r.time_spent) / existing.frequency;
      } else {
        patternMap.set(key, {
          from_route: r.from_route,
          to_route: r.to_route,
          frequency: 1,
          avg_time_spent: r.time_spent,
          transition_probability: 0,
        });
      }
    }

    for (const pattern of patternMap.values()) {
      const total = fromCounts.get(pattern.from_route) || 1;
      pattern.transition_probability = pattern.frequency / total;
    }

    return Array.from(patternMap.values()).sort((a, b) => b.frequency - a.frequency);
  }

  // ------------------- 推荐路由 -------------------

  recommendRoutes(
    currentRoute: string,
    userId?: string,
    strategy?: RecommendationStrategy
  ): RouteRecommendation[] {
    const activeStrategy = strategy ?? this.config.strategy;
    const patterns = this.analyzePatterns(userId);
    const fromPatterns = patterns.filter((p) => p.from_route === currentRoute);

    if (fromPatterns.length === 0) {
      return this.recommendByContext(currentRoute, userId);
    }

    const recommendations: RouteRecommendation[] = [];
    const profile = userId ? this.userProfiles.get(userId) : undefined;

    for (const pattern of fromPatterns) {
      let confidence = pattern.transition_probability;
      let reason = `基于导航模式: ${pattern.frequency} 次转移`;

      if (
        activeStrategy === RecommendationStrategy.HYBRID ||
        activeStrategy === RecommendationStrategy.PERFORMANCEBASED
      ) {
        const metrics = this.routeMetrics.get(pattern.to_route);
        if (metrics) {
          const perfBoost = metrics.performance_score * 0.3;
          confidence = confidence * 0.7 + perfBoost;
          reason += `，性能评分 ${metrics.performance_score.toFixed(2)}`;
        }
      }

      if (
        (activeStrategy === RecommendationStrategy.HYBRID ||
          activeStrategy === RecommendationStrategy.CONTEXTBASED) &&
        profile &&
        this.matchesTimeOfDay(profile)
      ) {
        confidence += 0.1;
        reason += '，符合当前时段习惯';
      }

      const metrics = this.routeMetrics.get(pattern.to_route);
      recommendations.push({
        target_route: pattern.to_route,
        confidence: Math.min(confidence, 1),
        reason,
        estimated_load_time: metrics?.avg_load_time ?? 0,
        user_intent: this.inferIntent(currentRoute, pattern.to_route),
        alternative_routes: this.findAlternatives(pattern.to_route, patterns),
      });
    }

    recommendations.sort((a, b) => b.confidence - a.confidence);
    return recommendations.slice(0, this.config.maxRecommendations);
  }

  // ------------------- 预测下一个路由 -------------------

  predictNextRoute(currentRoute: string, userId?: string): RouteRecommendation | null {
    const recommendations = this.recommendRoutes(currentRoute, userId);
    if (recommendations.length === 0) return null;

    const top = recommendations[0];
    if (top.confidence < this.config.defaultConfidenceThreshold) return null;

    this.predictionStats.total += 1;
    return top;
  }

  // ------------------- 优化路由顺序 -------------------

  optimizeRouteOrder(routes: string[], userId?: string): string[] {
    if (routes.length <= 1) return [...routes];

    const patterns = this.analyzePatterns(userId);
    const patternLookup = new Map<string, number>();

    for (const p of patterns) {
      patternLookup.set(`${p.from_route}->${p.to_route}`, p.transition_probability);
    }

    const scored = routes.map((route) => {
      let score = 0;
      let count = 0;
      for (const other of routes) {
        if (other === route) continue;
        const prob = patternLookup.get(`${other}->${route}`);
        if (prob !== undefined) {
          score += prob;
          count += 1;
        }
      }
      const metrics = this.routeMetrics.get(route);
      if (metrics) {
        score += metrics.performance_score * 0.2;
        count += 1;
      }
      const avgScore = count > 0 ? score / count : 0;
      return { route, score: avgScore };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.route);
  }

  // ------------------- 获取路由指标 -------------------

  getRouteMetrics(routePath: string): RouteMetrics | undefined {
    return this.routeMetrics.get(routePath);
  }

  getAllRouteMetrics(): RouteMetrics[] {
    return Array.from(this.routeMetrics.values());
  }

  // ------------------- 获取用户行为画像 -------------------

  getUserProfile(userId: string): UserBehaviorProfile | undefined {
    return this.userProfiles.get(userId);
  }

  // ------------------- 预加载推荐路由 -------------------

  preloadRecommended(
    currentRoute: string,
    userId?: string,
    preloadFn?: (route: string) => void
  ): string[] {
    const recommendations = this.recommendRoutes(currentRoute, userId);
    const toPreload = recommendations
      .slice(0, this.config.preloadTopN)
      .filter((r) => !this.preloadedRoutes.has(r.target_route))
      .map((r) => r.target_route);

    for (const route of toPreload) {
      this.preloadedRoutes.add(route);
      if (preloadFn) {
        preloadFn(route);
      }
    }

    return toPreload;
  }

  // ------------------- 反馈预测准确性 -------------------

  recordPredictionOutcome(predictedRoute: string, actualRoute: string): void {
    if (predictedRoute === actualRoute) {
      this.predictionStats.correct += 1;
    }
  }

  // ------------------- 统计信息 -------------------

  getStats(): SmartRouterStats {
    const allRoutes = Array.from(this.routeMetrics.keys());
    const topRecommended = this.navigationHistory.reduce<Record<string, number>>((acc, r) => {
      acc[r.to_route] = (acc[r.to_route] || 0) + 1;
      return acc;
    }, {});
    const topRoutes = Object.entries(topRecommended)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([route]) => route);

    const accuracy =
      this.predictionStats.total > 0
        ? this.predictionStats.correct / this.predictionStats.total
        : 0;

    return {
      total_users_tracked: this.userProfiles.size,
      total_routes_tracked: allRoutes.length,
      total_navigations_recorded: this.navigationHistory.length,
      avg_prediction_accuracy: accuracy,
      top_recommended_routes: topRoutes,
      active_strategy: this.config.strategy,
      cache_hit_rate:
        this.preloadedRoutes.size > 0
          ? Math.min(this.preloadedRoutes.size / Math.max(allRoutes.length, 1), 1)
          : 0,
    };
  }

  getConfig(): SmartRouterConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<SmartRouterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clear(): void {
    this.navigationHistory = [];
    this.userProfiles.clear();
    this.routeMetrics.clear();
    this.routePerformanceLog.clear();
    this.preloadedRoutes.clear();
    this.predictionStats = { correct: 0, total: 0 };
  }

  // ==================== 私有方法 ====================

  private updateUserProfile(
    userId: string,
    fromRoute: string,
    toRoute: string,
    timeSpent: number
  ): void {
    const existing = this.userProfiles.get(userId);
    const now = Date.now();

    if (existing) {
      existing.total_sessions += 1;
      existing.last_active = now;
      if (!existing.frequent_routes.includes(toRoute)) {
        existing.frequent_routes.push(toRoute);
        existing.frequent_routes.sort((a, b) => {
          const aCount = this.navigationHistory.filter((r) => r.to_route === a).length;
          const bCount = this.navigationHistory.filter((r) => r.to_route === b).length;
          return bCount - aCount;
        });
        if (existing.frequent_routes.length > 20) {
          existing.frequent_routes = existing.frequent_routes.slice(0, 20);
        }
      }
      const hour = new Date(now).getHours().toString();
      const slot = this.getTimeSlot(hour);
      if (!existing.time_of_day_patterns[slot]) {
        existing.time_of_day_patterns[slot] = [];
      }
      if (!existing.time_of_day_patterns[slot].includes(toRoute)) {
        existing.time_of_day_patterns[slot].push(toRoute);
      }
    } else {
      const slot = this.getTimeSlot(new Date(now).getHours().toString());
      this.userProfiles.set(userId, {
        user_id: userId,
        frequent_routes: [toRoute],
        avg_session_duration: timeSpent,
        preferred_modules: [toRoute],
        navigation_patterns: [],
        time_of_day_patterns: { [slot]: [toRoute] },
        last_active: now,
        total_sessions: 1,
      });
    }
  }

  private updateRouteUsage(routePath: string): void {
    const existing = this.routeMetrics.get(routePath);
    if (existing) {
      existing.usage_count += 1;
      existing.last_used = Date.now();
    } else {
      this.routeMetrics.set(routePath, {
        route_path: routePath,
        avg_load_time: 0,
        error_rate: 0,
        usage_count: 1,
        last_used: Date.now(),
        performance_score: 0,
      });
    }
  }

  private recordRoutePerformance(routePath: string, loadTime: number, error: boolean): void {
    const log = this.routePerformanceLog.get(routePath) || [];
    log.unshift({ route_path: routePath, load_time: loadTime, error, timestamp: Date.now() });
    if (log.length > 100) log.pop();
    this.routePerformanceLog.set(routePath, log);

    const metrics = this.routeMetrics.get(routePath);
    if (metrics) {
      const loadTimes = log.map((r) => r.load_time);
      metrics.avg_load_time = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
      metrics.error_rate = log.filter((r) => r.error).length / log.length;
      metrics.performance_score = this.calcPerformanceScore(metrics);
    }
  }

  private calcPerformanceScore(metrics: RouteMetrics): number {
    const weights = this.config.performanceScoreWeights;
    const loadScore =
      metrics.avg_load_time > 0 ? Math.max(0, 1 - metrics.avg_load_time / 5000) : 0.5;
    const errorScore = 1 - metrics.error_rate;
    const usageScore = Math.min(metrics.usage_count / 100, 1);
    return (
      loadScore * weights.loadTime + errorScore * weights.errorRate + usageScore * weights.usage
    );
  }

  private recommendByContext(currentRoute: string, userId?: string): RouteRecommendation[] {
    const profile = userId ? this.userProfiles.get(userId) : undefined;
    if (!profile) return [];

    const slot = this.getTimeSlot(new Date().getHours().toString());
    const slotRoutes = profile.time_of_day_patterns[slot] || [];

    return slotRoutes
      .filter((r) => r !== currentRoute)
      .slice(0, this.config.maxRecommendations)
      .map((route) => {
        const metrics = this.routeMetrics.get(route);
        return {
          target_route: route,
          confidence: 0.4,
          reason: '基于当前时段习惯',
          estimated_load_time: metrics?.avg_load_time ?? 0,
          user_intent: this.inferIntent(currentRoute, route),
          alternative_routes: [],
        };
      });
  }

  private findAlternatives(target: string, patterns: NavigationPattern[]): string[] {
    const alternatives = new Set<string>();
    for (const p of patterns) {
      if (p.to_route !== target && p.transition_probability > 0.1) {
        alternatives.add(p.to_route);
      }
    }
    return Array.from(alternatives).slice(0, 3);
  }

  private inferIntent(fromRoute: string, toRoute: string): string {
    if (toRoute.includes('dashboard')) return '查看概览';
    if (toRoute.includes('settings')) return '修改配置';
    if (toRoute.includes('list') || toRoute.includes('manage')) return '管理数据';
    if (toRoute.includes('detail') || toRoute.includes('view')) return '查看详情';
    if (toRoute.includes('create') || toRoute.includes('new')) return '创建内容';
    if (fromRoute.includes('list') && toRoute.includes('detail')) return '深入查看';
    return '常规导航';
  }

  private matchesTimeOfDay(profile: UserBehaviorProfile): boolean {
    const slot = this.getTimeSlot(new Date().getHours().toString());
    return Boolean(profile.time_of_day_patterns[slot]);
  }

  private getTimeSlot(hour: string): string {
    const h = parseInt(hour, 10);
    if (h < 6) return 'late_night';
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'evening';
  }
}

// ==================== 单例 ====================

export const smartRouter = new SmartRouter();
export default smartRouter;
