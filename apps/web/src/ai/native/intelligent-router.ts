export type RoutingStrategy = 'intent-based' | 'performance-based' | 'hybrid' | 'a/b-test';

export interface RoutePerformance {
  path: string;
  avg_latency_ms: number;
  p95_latency_ms: number;
  error_rate: number;
  cache_hit_rate: number;
  last_updated: number;
}
