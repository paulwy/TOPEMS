export interface RateLimitRule {
  requests: number;
  window_secs: number;
  priority: number;
}

export interface PathRule {
  path: string;
  rule: RateLimitRule;
}

export interface RateLimitConfig {
  enabled: boolean;
  by_tenant: boolean;
  by_user: boolean;
  by_ip: boolean;
  by_global: boolean;
  tenant_default: RateLimitRule;
  user_default: RateLimitRule;
  ip_default: RateLimitRule;
  global_default: RateLimitRule;
  path_rules: PathRule[];
  skip_paths: string[];
  updated_at?: string;
}

export interface AntiReplayConfig {
  enabled: boolean;
  tolerance_secs: number;
  nonce_cache_secs: number;
  timestamp_header: string;
  nonce_header: string;
  enforce_paths: string[];
}

export const DEFAULT_CONFIG: RateLimitConfig = {
  enabled: true,
  by_tenant: true,
  by_user: true,
  by_ip: true,
  by_global: true,
  tenant_default: { requests: 2000, window_secs: 60, priority: 0 },
  user_default: { requests: 500, window_secs: 60, priority: 0 },
  ip_default: { requests: 1000, window_secs: 60, priority: 0 },
  global_default: { requests: 50000, window_secs: 60, priority: 0 },
  path_rules: [],
  skip_paths: ['/health', '/api', '/api/info', '/metrics'],
};

export const DEFAULT_ANTI_REPLAY: AntiReplayConfig = {
  enabled: false,
  tolerance_secs: 300,
  nonce_cache_secs: 600,
  timestamp_header: 'X-Request-Timestamp',
  nonce_header: 'X-Request-Nonce',
  enforce_paths: [],
};
