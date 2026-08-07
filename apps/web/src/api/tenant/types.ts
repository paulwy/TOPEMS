export type TenantStatus = 'active' | 'suspended' | 'trial' | 'expired';

export type TenantPlan = 'basic' | 'professional' | 'enterprise';

export type TenantRole = 'superadmin' | 'admin' | 'member' | 'guest';

export type UserStatus = 'active' | 'invited' | 'suspended';

export interface Tenant {
  id: string;
  name: string;
  code: string;
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
