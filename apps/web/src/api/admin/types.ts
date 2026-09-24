export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: string;
  created_at: string;
  updated_at: string;
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
}

export interface AuditLog {
  id: string;
  user_id: string;
  username: string;
  action: string;
  resource: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  request_method?: string;
  request_path?: string;
  request_params?: Record<string, unknown>;
  response_status?: number;
  response_data?: Record<string, unknown>;
  duration_ms?: number;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export interface AuditLogQueryParams {
  page?: number;
  page_size?: number;
  user_id?: string;
  action?: string;
  resource?: string;
  start_date?: string;
  end_date?: string;
  success?: boolean;
  search?: string;
}
