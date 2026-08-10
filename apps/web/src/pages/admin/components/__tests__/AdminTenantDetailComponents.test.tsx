import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TenantOverviewTab from '../TenantOverviewTab';
import TenantBillingTab from '../TenantBillingTab';
import TenantSettingsTab from '../TenantSettingsTab';
import RateLimitDimensionCard from '../RateLimitDimensionCard';
import type { RateLimitRule } from '../../hooks/useRateLimitConfig';
import type { Tenant, TenantInvoice, TenantStats } from '@/api/tenant/types';

const mockCrudPage = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${JSON.stringify(options)}` : key,
  }),
}));

vi.mock('lucide-react', () => ({
  Users: () => <span data-testid='users-icon' />,
  Activity: () => <span data-testid='activity-icon' />,
  HardDrive: () => <span data-testid='hard-drive-icon' />,
  BarChart3: () => <span data-testid='bar-chart-icon' />,
  CreditCard: () => <span data-testid='credit-card-icon' />,
  Palette: () => <span data-testid='palette-icon' />,
  Shield: () => <span data-testid='shield-icon' />,
  Settings: () => <span data-testid='settings-icon' />,
  CheckCircle: () => <span data-testid='check-circle-icon' />,
  XCircle: () => <span data-testid='x-circle-icon' />,
}));

vi.mock('@/components/templates/CrudPage', () => ({
  default: (props: Record<string, unknown>) => {
    mockCrudPage(props);
    return <div data-testid='crud-page'>{props.headerContent as React.ReactNode}</div>;
  },
}));

vi.mock('@/schemas/admin', () => ({
  tenantInvoiceSchema: { name: 'tenantInvoiceSchema' },
}));

const tenant: Tenant = {
  id: 'tenant-1',
  name: '拓普能源',
  code: 'TOPEMS',
  slug: 'topems',
  tenant_type: 'enterprise',
  plan: 'professional',
  license_type: 'subscription',
  quota_users: 100,
  quota_storage_gb: 500,
  quota_api_calls: 10000,
  features: {
    crm: true,
    ai: false,
  },
  settings: {
    max_users: 100,
    max_storage_gb: 500,
    max_api_requests_per_day: 10000,
    branding: {
      primary_color: '#1976d2',
      secondary_color: '#9c27b0',
      custom_domain: 'portal.topems.example',
    },
    security: {
      sso_enabled: true,
      two_factor_required: false,
      ip_whitelist_enabled: true,
      session_timeout_minutes: 30,
    },
    features: {
      crm: true,
      ai: false,
      wms: true,
    },
  },
  status: 'active',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const stats: TenantStats = {
  total_users: 25,
  active_users: 20,
  storage_used_gb: 125,
  api_requests_today: 2500,
  monthly_active_users: 18,
  last_30d_logins: 320,
};

const invoices: TenantInvoice[] = [
  {
    id: 'invoice-1',
    amount: 1999,
    currency: 'CNY',
    status: 'paid',
    period_start: '2024-01-01',
    period_end: '2024-01-31',
    created_at: '2024-02-01T00:00:00Z',
    paid_at: '2024-02-02T00:00:00Z',
  },
];

describe('TenantOverviewTab', () => {
  it('renders tenant usage metrics and quota percentages', () => {
    render(
      <TenantOverviewTab
        tenant={tenant}
        stats={stats}
      />
    );

    expect(screen.getByText('admin.tenant_detail.total_users')).toBeInTheDocument();
    expect(screen.getByText('admin.tenant_detail.active_users')).toBeInTheDocument();
    expect(screen.getByText('admin.tenant_detail.storage_usage')).toBeInTheDocument();
    expect(screen.getByText('125/500GB')).toBeInTheDocument();
    expect(screen.getByText('admin.tenant_detail_page.text_207914')).toBeInTheDocument();
    expect(screen.getAllByText('25%')).toHaveLength(3);
  });

  it('passes quota values into translated summary text', () => {
    render(
      <TenantOverviewTab
        tenant={tenant}
        stats={stats}
      />
    );

    expect(
      screen.getByText('admin.tenant_detail_page.text_82d3a8:{"var0":25,"var1":100}')
    ).toBeInTheDocument();
    expect(
      screen.getByText('admin.tenant_detail_page.text_e7bb98:{"var0":125,"var1":500}')
    ).toBeInTheDocument();
    expect(
      screen.getByText('admin.tenant_detail_page.text_bbac12:{"var0":"2,500","var1":"10,000"}')
    ).toBeInTheDocument();
  });
});

describe('TenantBillingTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders billing summary and invoice CrudPage adapter', async () => {
    render(
      <TenantBillingTab
        tenant={tenant}
        invoices={invoices}
      />
    );

    expect(screen.getByText('admin.tenant_detail_page.text_5b6572')).toBeInTheDocument();
    expect(screen.getByText('admin.tenant_detail.pro_edition')).toBeInTheDocument();
    expect(screen.getByText('admin.tenant_detail.normal')).toBeInTheDocument();
    expect(screen.getByText('admin.tenant_detail.billing_history')).toBeInTheDocument();

    const props = mockCrudPage.mock.calls[0][0];
    await expect(props.apiAdapter.list()).resolves.toEqual({ data: invoices, total: 1 });
    await expect(props.apiAdapter.create()).resolves.toEqual({});
    await expect(props.apiAdapter.update()).resolves.toEqual({});
    await expect(props.apiAdapter.delete()).resolves.toBeUndefined();
    expect(props.schema).toEqual({ name: 'tenantInvoiceSchema' });
  });
});

describe('TenantSettingsTab', () => {
  it('renders branding, security and feature settings', () => {
    render(<TenantSettingsTab tenant={tenant} />);

    expect(screen.getByText('admin.tenant_detail_page.text_74070e')).toBeInTheDocument();
    expect(screen.getByText('#1976d2')).toBeInTheDocument();
    expect(screen.getByText('#9c27b0')).toBeInTheDocument();
    expect(screen.getByText('portal.topems.example')).toBeInTheDocument();
    expect(screen.getByText('admin.tenant_detail_page.text_c8bf34')).toBeInTheDocument();
    expect(
      screen.getByText(
        'admin.tenant_detail_page.text_3a17b7:{"tenant_settings_security_session_timeout_minutes":30}'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('crm')).toBeInTheDocument();
    expect(screen.getByText('ai')).toBeInTheDocument();
    expect(screen.getAllByTestId('check-circle-icon')).toHaveLength(2);
    expect(screen.getAllByTestId('x-circle-icon')).toHaveLength(1);
  });

  it('falls back to not-set label when custom domain is missing', () => {
    render(
      <TenantSettingsTab
        tenant={{
          ...tenant,
          settings: {
            ...tenant.settings,
            branding: {
              ...tenant.settings.branding,
              custom_domain: undefined,
            },
          },
        }}
      />
    );

    expect(screen.getByText('admin.tenant_detail.not_set')).toBeInTheDocument();
  });
});

describe('RateLimitDimensionCard', () => {
  const rule: RateLimitRule = {
    requests: 100,
    window_secs: 60,
    priority: 10,
  };

  it('renders rate limit fields and emits numeric updates', () => {
    const onUpdateRule = vi.fn();
    render(
      <RateLimitDimensionCard
        dimKey='tenant_default'
        title='租户默认限流'
        icon={<span data-testid='rate-limit-icon' />}
        color='#1976d2'
        description='按租户维度限制请求'
        rule={rule}
        onUpdateRule={onUpdateRule}
      />
    );

    expect(screen.getByText('租户默认限流')).toBeInTheDocument();
    expect(screen.getByText('按租户维度限制请求')).toBeInTheDocument();
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();
    expect(screen.getByDisplayValue('60')).toBeInTheDocument();
    expect(screen.getByDisplayValue('10')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.allowed_requests'), {
      target: { value: '250' },
    });
    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.time_window'), {
      target: { value: '120' },
    });
    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.priority'), {
      target: { value: '20' },
    });

    expect(onUpdateRule).toHaveBeenCalledWith('tenant_default', 'requests', 250);
    expect(onUpdateRule).toHaveBeenCalledWith('tenant_default', 'window_secs', 120);
    expect(onUpdateRule).toHaveBeenCalledWith('tenant_default', 'priority', 20);
  });

  it('normalizes empty numeric values to field defaults', () => {
    const onUpdateRule = vi.fn();
    render(
      <RateLimitDimensionCard
        dimKey='global_default'
        title='全局限流'
        icon={<span />}
        color='#f57c00'
        description='全局保护'
        rule={rule}
        onUpdateRule={onUpdateRule}
      />
    );

    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.allowed_requests'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.time_window'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('admin.rate_limit_config.priority'), {
      target: { value: '' },
    });

    expect(onUpdateRule).toHaveBeenCalledWith('global_default', 'requests', 0);
    expect(onUpdateRule).toHaveBeenCalledWith('global_default', 'window_secs', 1);
    expect(onUpdateRule).toHaveBeenCalledWith('global_default', 'priority', 0);
  });
});
