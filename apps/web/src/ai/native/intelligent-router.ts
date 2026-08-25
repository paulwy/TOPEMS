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
  '/dashboard': {
    path: '/dashboard',
    avg_latency_ms: 120,
    p95_latency_ms: 280,
    error_rate: 0.002,
    cache_hit_rate: 0.85,
    last_updated: Date.now(),
  },
  '/bi/analytics': {
    path: '/bi/analytics',
    avg_latency_ms: 350,
    p95_latency_ms: 800,
    error_rate: 0.01,
    cache_hit_rate: 0.6,
    last_updated: Date.now(),
  },
  '/crm/customers': {
    path: '/crm/customers',
    avg_latency_ms: 200,
    p95_latency_ms: 450,
    error_rate: 0.005,
    cache_hit_rate: 0.75,
    last_updated: Date.now(),
  },
  '/scm/orders': {
    path: '/scm/orders',
    avg_latency_ms: 180,
    p95_latency_ms: 400,
    error_rate: 0.008,
    cache_hit_rate: 0.7,
    last_updated: Date.now(),
  },
  '/pdm/products': {
    path: '/pdm/products',
    avg_latency_ms: 150,
    p95_latency_ms: 350,
    error_rate: 0.003,
    cache_hit_rate: 0.8,
    last_updated: Date.now(),
  },
  '/hrm/employees': {
    path: '/hrm/employees',
    avg_latency_ms: 130,
    p95_latency_ms: 300,
    error_rate: 0.004,
    cache_hit_rate: 0.82,
    last_updated: Date.now(),
  },
  '/erp/finance': {
    path: '/erp/finance',
    avg_latency_ms: 220,
    p95_latency_ms: 500,
    error_rate: 0.006,
    cache_hit_rate: 0.72,
    last_updated: Date.now(),
  },
  '/wms/inventory': {
    path: '/wms/inventory',
    avg_latency_ms: 160,
    p95_latency_ms: 380,
    error_rate: 0.007,
    cache_hit_rate: 0.78,
    last_updated: Date.now(),
  },
  '/qms/dashboard': {
    path: '/qms/dashboard',
    avg_latency_ms: 190,
    p95_latency_ms: 420,
    error_rate: 0.005,
    cache_hit_rate: 0.76,
    last_updated: Date.now(),
  },
  '/workflow/tasks': {
    path: '/workflow/tasks',
    avg_latency_ms: 140,
    p95_latency_ms: 320,
    error_rate: 0.003,
    cache_hit_rate: 0.83,
    last_updated: Date.now(),
  },
  '/ai/chat': {
    path: '/ai/chat',
    avg_latency_ms: 80,
    p95_latency_ms: 180,
    error_rate: 0.001,
    cache_hit_rate: 0.9,
    last_updated: Date.now(),
  },
  '/admin/monitor': {
    path: '/admin/monitor',
    avg_latency_ms: 250,
    p95_latency_ms: 550,
    error_rate: 0.012,
    cache_hit_rate: 0.55,
    last_updated: Date.now(),
  },
};
