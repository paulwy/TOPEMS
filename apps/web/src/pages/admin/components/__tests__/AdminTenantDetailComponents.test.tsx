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

vi.mock('react-i18next', () => {
  const sources = [
    require('../../../../i18n/locales/zh/admin.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/iam.json'),
    require('../../../../i18n/locales/zh/shared.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: any) => {
    let base = i18nMap[key] ?? key;
    if (options === undefined || options === null) return base;
    let didReplace = false;
    const tryReplace = (phName: string, valStr: string) => {
      const p1 = `{{${phName}}}`;
      const p2 = `{${phName}}`;
      const p3 = `\${${phName}}`;
      if (base.includes(p1)) {
        base = base.split(p1).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p2)) {
        base = base.split(p2).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p3)) {
        base = base.split(p3).join(valStr);
        didReplace = true;
        return true;
      }
      return false;
    };
    if (typeof options === 'object') {
      for (const [k, v] of Object.entries(options)) tryReplace(k, String(v));
      if (!didReplace) base = `${base}:${JSON.stringify(options)}`;
    } else {
      const strVal = String(options);
      if (!tryReplace('0', strVal)) {
        base = `${base}:${strVal}`;
      }
    }
    return base;
  };
  return {
    useTranslation: () => ({ t, i18n: { language: 'zh' } }),
    initReactI18next: { type: '3rdParty', init: () => {} },
    Trans: ({ i18nKey, children }: { i18nKey?: string; children?: any }) =>
      i18nKey ? (i18nMap[i18nKey] ?? i18nKey) : children,
  };
});

vi.mock('@/i18n', () => {
  const sources = [
    require('../../../../i18n/locales/zh/admin.json'),
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/iam.json'),
    require('../../../../i18n/locales/zh/shared.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: any) => {
    let base = i18nMap[key] ?? key;
    if (options === undefined || options === null) return base;
    let didReplace = false;
    const tryReplace = (phName: string, valStr: string) => {
      const p1 = `{{${phName}}}`;
      const p2 = `{${phName}}`;
      const p3 = `\${${phName}}`;
      if (base.includes(p1)) {
        base = base.split(p1).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p2)) {
        base = base.split(p2).join(valStr);
        didReplace = true;
        return true;
      }
      if (base.includes(p3)) {
        base = base.split(p3).join(valStr);
        didReplace = true;
        return true;
      }
      return false;
    };
    if (typeof options === 'object') {
      for (const [k, v] of Object.entries(options)) tryReplace(k, String(v));
      if (!didReplace) base = `${base}:${JSON.stringify(options)}`;
    } else {
      const strVal = String(options);
      if (!tryReplace('0', strVal)) {
        base = `${base}:${strVal}`;
      }
    }
    return base;
  };
  return {
    default: {
      t,
      language: 'zh',
      on: () => {},
      use: () => ({ init: () => {} }),
      init: () => {},
    },
  };
});

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
      // eslint-disable-next-line topems-design/no-hardcoded-colors -- 测试断言具体色值，不适用 design tokens
      primary_color: '#1976d2',
      // eslint-disable-next-line topems-design/no-hardcoded-colors -- 测试断言具体色值，不适用 design tokens
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

    expect(screen.getByText('用户总数')).toBeInTheDocument();
    expect(screen.getByText('活跃用户')).toBeInTheDocument();
    expect(screen.getByText('存储用量')).toBeInTheDocument();
    expect(screen.getByText('125/500GB')).toBeInTheDocument();
    expect(screen.getByText('套餐配额')).toBeInTheDocument();
    expect(screen.getAllByText('25%')).toHaveLength(3);
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

    expect(screen.getByText('当前订阅')).toBeInTheDocument();
    expect(screen.getByText('专业版')).toBeInTheDocument();
    expect(screen.getByText('正常')).toBeInTheDocument();
    expect(screen.getByText('计费历史')).toBeInTheDocument();

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

    expect(screen.getByText('品牌设置')).toBeInTheDocument();
    expect(screen.getByText('#1976d2')).toBeInTheDocument();
    expect(screen.getByText('#9c27b0')).toBeInTheDocument();
    expect(screen.getByText('portal.topems.example')).toBeInTheDocument();
    expect(screen.getByText('安全设置')).toBeInTheDocument();
    expect(screen.getByText('30 分钟')).toBeInTheDocument();
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

    expect(screen.getByText('未设置')).toBeInTheDocument();
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

    fireEvent.change(screen.getByLabelText('允许请求数'), {
      target: { value: '250' },
    });
    fireEvent.change(screen.getByLabelText('时间窗口'), {
      target: { value: '120' },
    });
    fireEvent.change(screen.getByLabelText('优先级'), {
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

    fireEvent.change(screen.getByLabelText('允许请求数'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('时间窗口'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('优先级'), {
      target: { value: '' },
    });

    expect(onUpdateRule).toHaveBeenCalledWith('global_default', 'requests', 0);
    expect(onUpdateRule).toHaveBeenCalledWith('global_default', 'window_secs', 1);
    expect(onUpdateRule).toHaveBeenCalledWith('global_default', 'priority', 0);
  });
});
