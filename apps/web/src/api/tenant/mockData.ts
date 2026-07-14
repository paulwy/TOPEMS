import type { Tenant, TenantUser, TenantStats, UsageMetrics, TenantBillingInfo, TenantInvoice } from './types';

export const mockTenants: Tenant[] = [
  {
    id: 'tenant-001',
    name: 'TOPEMS Corp',
    slug: 'topems-corp',
    status: 'active',
    plan: 'enterprise',
    settings: {
      max_users: 9999,
      max_storage_gb: 9999,
      max_api_requests_per_day: 9999999,
      features: {},
      branding: {
        primary_color: 'primary.main',
        secondary_color: 'grey.500',
      },
      security: {
        sso_enabled: true,
        two_factor_required: true,
        ip_whitelist_enabled: false,
        allowed_ip_ranges: [],
        session_timeout_minutes: 60,
      },
    },
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2026-07-10T14:30:00Z',
    metadata: {},
  },
  {
    id: 'tenant-002',
    name: 'Acme Manufacturing',
    slug: 'acme-mfg',
    status: 'active',
    plan: 'professional',
    settings: {
      max_users: 100,
      max_storage_gb: 200,
      max_api_requests_per_day: 200000,
      features: {},
      branding: {
        primary_color: 'primary.main',
        secondary_color: 'grey.500',
      },
      security: {
        sso_enabled: false,
        two_factor_required: false,
        ip_whitelist_enabled: false,
        allowed_ip_ranges: [],
        session_timeout_minutes: 60,
      },
    },
    created_at: '2024-03-20T10:00:00Z',
    updated_at: '2026-07-08T09:15:00Z',
    metadata: {},
  },
  {
    id: 'tenant-003',
    name: 'Beta Labs',
    slug: 'beta-labs',
    status: 'trial',
    plan: 'free',
    settings: {
      max_users: 5,
      max_storage_gb: 5,
      max_api_requests_per_day: 1000,
      features: {},
      branding: {
        primary_color: 'primary.main',
        secondary_color: 'grey.500',
      },
      security: {
        sso_enabled: false,
        two_factor_required: false,
        ip_whitelist_enabled: false,
        allowed_ip_ranges: [],
        session_timeout_minutes: 60,
      },
    },
    created_at: '2026-06-01T12:00:00Z',
    updated_at: '2026-07-14T08:00:00Z',
    metadata: {},
  },
];

export const generateMockTenantUsers = (tenantId: string): TenantUser[] => {
  const roles: ('owner' | 'admin' | 'member' | 'guest')[] = ['owner', 'admin', 'member', 'member', 'guest'];
  const statuses: ('active' | 'invited' | 'suspended')[] = ['active', 'active', 'active', 'invited', 'suspended'];
  
  return roles.map((role, index) => ({
    id: `user-${tenantId}-${index + 1}`,
    tenant_id: tenantId,
    user_id: `uid-${tenantId}-${index + 1}`,
    email: `user${index + 1}@example.com`,
    role,
    status: statuses[index],
    created_at: '2026-01-01T00:00:00Z',
    last_login: statuses[index] === 'active' ? '2026-07-14T09:00:00Z' : undefined,
  }));
};

export const generateMockTenantStats = (_tenantId: string): TenantStats => ({
  total_users: 125,
  active_users: 98,
  storage_used_gb: 45.7,
  api_requests_today: 12450,
  monthly_active_users: 87,
  last_30d_logins: 2340,
});

export const generateMockUsageMetrics = (_tenantId: string): UsageMetrics => ({
  tenant_id: 'tenant-001',
  users_count: 125,
  storage_used_gb: 45.7,
  api_requests_today: 12450,
  updated_at: new Date().toISOString(),
});

export const generateMockBillingInfo = (plan: string): TenantBillingInfo => ({
  plan: plan as any,
  current_period_start: '2026-07-01T00:00:00Z',
  current_period_end: '2026-08-01T00:00:00Z',
  next_billing_date: '2026-08-01T00:00:00Z',
  status: 'active',
});

export const generateMockInvoices = (): TenantInvoice[] => [
  {
    id: 'inv-001',
    amount: 999.0,
    currency: 'USD',
    status: 'paid',
    period_start: '2026-06-01T00:00:00Z',
    period_end: '2026-07-01T00:00:00Z',
    created_at: '2026-06-01T00:00:00Z',
    paid_at: '2026-06-02T10:00:00Z',
  },
  {
    id: 'inv-002',
    amount: 999.0,
    currency: 'USD',
    status: 'pending',
    period_start: '2026-07-01T00:00:00Z',
    period_end: '2026-08-01T00:00:00Z',
    created_at: '2026-07-01T00:00:00Z',
  },
];