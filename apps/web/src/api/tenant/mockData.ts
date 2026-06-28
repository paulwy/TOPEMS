import type {
  Tenant,
  TenantUser,
  TenantStats,
  TenantBillingInfo,
  TenantInvoice,
  UsageMetrics,
  TenantPlan,
} from './types';

const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const now = new Date();
const daysAgo = (days: number): string => {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const plans: TenantPlan[] = ['free', 'basic', 'professional', 'enterprise'];

export const mockTenants: Tenant[] = [
  {
    id: generateId(),
    name: 'Acme Corporation',
    slug: 'acme',
    status: 'active',
    plan: 'enterprise',
    settings: {
      max_users: 500,
      max_storage_gb: 1000,
      max_api_requests_per_day: 1000000,
      features: {
        advanced_reporting: true,
        sso: true,
        api_access: true,
        custom_branding: true,
      },
      branding: {
        logo_url: undefined,
        primary_color: '#3B82F6',
        secondary_color: '#6B7280',
        custom_domain: 'acme.topems.com',
      },
      security: {
        sso_enabled: true,
        two_factor_required: true,
        ip_whitelist_enabled: false,
        allowed_ip_ranges: [],
        session_timeout_minutes: 120,
      },
    },
    created_at: daysAgo(365),
    updated_at: daysAgo(7),
    metadata: {
      industry: 'manufacturing',
      size: 'enterprise',
    },
  },
  {
    id: generateId(),
    name: 'TechStart Inc.',
    slug: 'techstart',
    status: 'active',
    plan: 'professional',
    settings: {
      max_users: 100,
      max_storage_gb: 200,
      max_api_requests_per_day: 200000,
      features: {
        advanced_reporting: true,
        sso: false,
        api_access: true,
        custom_branding: true,
      },
      branding: {
        logo_url: undefined,
        primary_color: '#10B981',
        secondary_color: '#059669',
        custom_domain: undefined,
      },
      security: {
        sso_enabled: false,
        two_factor_required: false,
        ip_whitelist_enabled: false,
        allowed_ip_ranges: [],
        session_timeout_minutes: 60,
      },
    },
    created_at: daysAgo(180),
    updated_at: daysAgo(3),
    metadata: {
      industry: 'technology',
      size: 'mid-market',
    },
  },
  {
    id: generateId(),
    name: 'Global Logistics',
    slug: 'global-logistics',
    status: 'active',
    plan: 'basic',
    settings: {
      max_users: 25,
      max_storage_gb: 50,
      max_api_requests_per_day: 50000,
      features: {
        advanced_reporting: false,
        sso: false,
        api_access: true,
        custom_branding: false,
      },
      branding: {
        logo_url: undefined,
        primary_color: '#F59E0B',
        secondary_color: '#D97706',
        custom_domain: undefined,
      },
      security: {
        sso_enabled: false,
        two_factor_required: false,
        ip_whitelist_enabled: false,
        allowed_ip_ranges: [],
        session_timeout_minutes: 60,
      },
    },
    created_at: daysAgo(90),
    updated_at: daysAgo(14),
    metadata: {
      industry: 'logistics',
      size: 'small-business',
    },
  },
  {
    id: generateId(),
    name: 'Beta Labs',
    slug: 'beta-labs',
    status: 'trial',
    plan: 'free',
    settings: {
      max_users: 5,
      max_storage_gb: 5,
      max_api_requests_per_day: 1000,
      features: {
        advanced_reporting: false,
        sso: false,
        api_access: false,
        custom_branding: false,
      },
      branding: {
        logo_url: undefined,
        primary_color: '#8B5CF6',
        secondary_color: '#7C3AED',
        custom_domain: undefined,
      },
      security: {
        sso_enabled: false,
        two_factor_required: false,
        ip_whitelist_enabled: false,
        allowed_ip_ranges: [],
        session_timeout_minutes: 30,
      },
    },
    created_at: daysAgo(7),
    updated_at: daysAgo(1),
    metadata: {
      industry: 'biotech',
      size: 'startup',
    },
  },
  {
    id: generateId(),
    name: 'Suspended Corp',
    slug: 'suspended-corp',
    status: 'suspended',
    plan: 'professional',
    settings: {
      max_users: 100,
      max_storage_gb: 200,
      max_api_requests_per_day: 200000,
      features: {
        advanced_reporting: true,
        sso: true,
        api_access: true,
        custom_branding: true,
      },
      branding: {
        logo_url: undefined,
        primary_color: '#EF4444',
        secondary_color: '#DC2626',
        custom_domain: undefined,
      },
      security: {
        sso_enabled: true,
        two_factor_required: true,
        ip_whitelist_enabled: false,
        allowed_ip_ranges: [],
        session_timeout_minutes: 60,
      },
    },
    created_at: daysAgo(200),
    updated_at: daysAgo(30),
    metadata: {
      industry: 'finance',
      size: 'mid-market',
    },
  },
];

export const generateMockTenantUsers = (tenantId: string): TenantUser[] => {
  const roles: TenantUser['role'][] = ['owner', 'admin', 'member', 'guest'];
  const statuses: TenantUser['status'][] = ['active', 'active', 'active', 'invited', 'suspended'];
  const users: TenantUser[] = [];
  const count = Math.floor(Math.random() * 30) + 5;

  for (let i = 0; i < count; i++) {
    users.push({
      id: generateId(),
      tenant_id: tenantId,
      user_id: generateId(),
      email: `user${i + 1}@tenant.com`,
      role: roles[Math.floor(Math.random() * roles.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      created_at: daysAgo(Math.floor(Math.random() * 180)),
      last_login: Math.random() > 0.3 ? daysAgo(Math.floor(Math.random() * 30)) : undefined,
    });
  }

  return users;
};

export const generateMockTenantStats = (tenantId: string): TenantStats => {
  const total = Math.floor(Math.random() * 100) + 10;
  return {
    total_users: total,
    active_users: Math.floor(total * 0.7),
    storage_used_gb: Math.floor(Math.random() * 100),
    api_requests_today: Math.floor(Math.random() * 50000),
    monthly_active_users: Math.floor(total * 0.85),
    last_30d_logins: Math.floor(Math.random() * 500) + 50,
  };
};

export const generateMockUsageMetrics = (tenantId: string): UsageMetrics => {
  return {
    tenant_id: tenantId,
    users_count: Math.floor(Math.random() * 50) + 5,
    storage_used_gb: Math.random() * 50,
    api_requests_today: Math.floor(Math.random() * 100000),
    updated_at: new Date().toISOString(),
  };
};

export const generateMockBillingInfo = (plan: TenantPlan): TenantBillingInfo => {
  return {
    plan,
    current_period_start: daysAgo(15),
    current_period_end: daysAgo(-15),
    next_billing_date: daysAgo(-15),
    status: 'active',
  };
};

export const generateMockInvoices = (): TenantInvoice[] => {
  const invoices: TenantInvoice[] = [];
  for (let i = 0; i < 6; i++) {
    invoices.push({
      id: `INV-${2024}${String(12 - i).padStart(2, '0')}-${String(i + 1).padStart(4, '0')}`,
      amount: Math.floor(Math.random() * 5000) + 100,
      currency: 'CNY',
      status: i < 5 ? 'paid' : 'pending',
      period_start: daysAgo(30 * (i + 1)),
      period_end: daysAgo(30 * i),
      created_at: daysAgo(30 * i + 2),
      paid_at: i < 5 ? daysAgo(30 * i + 1) : undefined,
    });
  }
  return invoices;
};
