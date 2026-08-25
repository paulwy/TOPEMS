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
