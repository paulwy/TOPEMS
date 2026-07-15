export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_details?: Record<string, unknown>;
  response_details?: Record<string, unknown>;
  status: string;
  error_message?: string;
  duration_ms?: number;
  created_at: string;
}

export interface AuditLogQueryParams {
  page?: number;
  pagesize?: number;
  user_id?: string;
  user_name?: string;
  action?: string;
  entity_type?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  search?: string;
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  total: number;
  page: number;
  pagesize: number;
}

export interface SystemConfig {
  site_name: string;
  site_description?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  enable_registration: boolean;
  enable_sso: boolean;
  default_role?: string;
  max_upload_size?: number;
  allowed_file_types?: string[];
  session_timeout_minutes?: number;
  password_min_length?: number;
  password_require_uppercase?: boolean;
  password_require_lowercase?: boolean;
  password_require_number?: boolean;
  password_require_symbol?: boolean;
  timezone?: string;
  date_format?: string;
  time_format?: string;
  language?: string;
}

export interface CacheConfig {
  enabled: boolean;
  provider: 'redis' | 'memory' | 'memcached';
  redis_host?: string;
  redis_port?: number;
  redis_password?: string;
  redis_db?: number;
  default_ttl_seconds?: number;
  max_memory_mb?: number;
  compression_enabled?: boolean;
  cache_prefix?: string;
}

export interface LogConfig {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  format: 'json' | 'text';
  output: 'console' | 'file' | 'both';
  file_path?: string;
  max_file_size_mb?: number;
  max_files?: number;
  log_to_db?: boolean;
  console_enabled?: boolean;
  remote_logging_enabled?: boolean;
  remote_logging_url?: string;
}

export interface SystemParams {
  system: SystemConfig;
  cache: CacheConfig;
  logging: LogConfig;
}
