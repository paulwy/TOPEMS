export type TenantStatus = 'active' | 'suspended' | 'trial' | 'deleted';

export type TenantPlan = 'free' | 'basic' | 'professional' | 'enterprise';

export type TenantRole = 'owner' | 'admin' | 'member' | 'guest';

export type UserStatus = 'active' | 'invited' | 'suspended';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: TenantPlan;
  settings: TenantSettings;
  created_at: string;
  updated_at: string;
  metadata: Record<string, string>;
}

export interface TenantSettings {
  max_users: number;
  max_storage_gb: number;
  max_api_requests_per_day: number;
  features: Record<string, boolean>;
  branding: BrandingSettings;
  security: SecuritySettings;
}

export interface BrandingSettings {
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  custom_domain?: string;
}

export interface SecuritySettings {
  sso_enabled: boolean;
  two_factor_required: boolean;
  ip_whitelist_enabled: boolean;
  allowed_ip_ranges: string[];
  session_timeout_minutes: number;
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

export interface UsageLimitExceeded {
  limit_type: string;
  limit: number;
  current: number;
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
  slug: string;
  plan: TenantPlan;
  settings?: Partial<TenantSettings>;
}

export interface UpdateTenantRequest {
  name?: string;
  status?: TenantStatus;
  plan?: TenantPlan;
  settings?: Partial<TenantSettings>;
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
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
}

export interface TenantInvoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'draft';
  period_start: string;
  period_end: string;
  created_at: string;
  paid_at?: string;
}

export interface TenantContext {
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  permissions: string[];
}
