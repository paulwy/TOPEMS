export type TenantStatus = 'active' | 'suspended' | 'trial' | 'expired';

export type TenantPlan = 'basic' | 'professional' | 'enterprise';

export type TenantRole = 'superadmin' | 'admin' | 'member' | 'guest' | 'owner';

export type UserStatus = 'active' | 'invited' | 'suspended';

export interface TenantBrandingSettings {
  primary_color: string;
  secondary_color: string;
  custom_domain?: string;
}

export interface TenantSecuritySettings {
  sso_enabled: boolean;
  two_factor_required: boolean;
  ip_whitelist_enabled: boolean;
  session_timeout_minutes: number;
  allowed_ip_ranges?: string[];
}

export interface TenantSettings {
  max_users: number;
  max_storage_gb: number;
  max_api_requests_per_day: number;
  branding: TenantBrandingSettings;
  security: TenantSecuritySettings;
  features: Record<string, boolean>;
}

export interface Tenant {
  id: string;
  name: string;
  code: string;
  slug: string;
  tenant_type: string;
  plan: TenantPlan;
  license_type: string;
  license_expires_at?: string;
  database_host?: string;
  database_port?: number;
  database_name?: string;
  quota_users: number;
  quota_storage_gb?: number;
  quota_api_calls?: number;
  quota_plugins?: string[];
  features: Record<string, boolean>;
  settings: TenantSettings;
  status: TenantStatus;
  trial_expires_at?: string;
  created_at: string;
  updated_at: string;
  activated_at?: string;
  suspended_at?: string;
}

export interface TenantUser {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string;
  role: TenantRole;
  status: UserStatus;
  created_at: string;
  last_login?: string;
}

export interface UsageMetrics {
  tenant_id: string;
  users_count: number;
  storage_used_gb: number;
  api_requests_today: number;
  updated_at: string;
}

export interface TenantStats {
  total_users: number;
  active_users: number;
  storage_used_gb: number;
  api_requests_today: number;
  monthly_active_users: number;
  last_30d_logins: number;
}

export interface CreateTenantRequest {
  name: string;
  code: string;
  tenant_type?: string;
  plan?: TenantPlan;
  license_type?: string;
  license_expires_at?: string;
  trial_expires_at?: string;
}

export interface UpdateTenantRequest {
  name?: string;
  plan?: TenantPlan;
  status?: TenantStatus;
  quota_users?: number;
  quota_storage_gb?: number;
  quota_api_calls?: number;
  features?: Record<string, boolean>;
  settings?: Partial<TenantSettings>;
  slug?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: TenantRole;
}

export interface UpdateMemberRoleRequest {
  role: TenantRole;
}

export interface TenantBillingInfo {
  plan: TenantPlan;
  current_period_start: string;
  current_period_end: string;
  next_billing_date: string;
  status: string;
}

export interface TenantInvoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  period_start: string;
  period_end: string;
  created_at: string;
  paid_at?: string;
}

export interface TenantContext {
  tenant_id: string;
  user_id: string;
  role: string;
  permissions: string[];
}

export interface ListTenantsResponse {
  items: Tenant[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListTenantUsersResponse {
  items: TenantUser[];
  total: number;
  page: number;
  pageSize: number;
}
