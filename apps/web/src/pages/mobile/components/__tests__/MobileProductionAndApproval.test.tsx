import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '@/__tests__/test-utils';

import { ApprovalCard } from '../ApprovalCard';
import { MobileProductionActions } from '../MobileProductionActions';
import { MobileProductionCard } from '../MobileProductionCard';
import { MobileProductionFilters } from '../MobileProductionFilters';
import { MobileQualitySearchBar } from '../MobileQualitySearchBar';
import type { ProductionOrder, WorkReport, Equipment } from '@/api/mobile';
import type { ApprovalItem } from '../../hooks/useMobileApproval';

const mockAddNotification = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => {
  const sources = [
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/mes.json'),
    require('../../../../i18n/locales/zh/aps.json'),
    require('../../../../i18n/locales/zh/shared.json'),
    require('../../../../i18n/locales/zh/qms.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: any) => {
    let base = (i18nMap[key] ?? key) as string;
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
      if (!didReplace) {
        const keys = Object.keys(options);
        if (keys.length === 1) {
          base = `${base} ${String((options as any)[keys[0]])}`;
        } else {
          base = `${base}:${JSON.stringify(options)}`;
        }
      }
    } else {
      const strVal = String(options);
      if (!tryReplace('0', strVal)) {
        base = `${base} ${strVal}`;
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
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/mes.json'),
    require('../../../../i18n/locales/zh/aps.json'),
    require('../../../../i18n/locales/zh/shared.json'),
    require('../../../../i18n/locales/zh/qms.json'),
  ];
  const i18nMap: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      i18nMap[k] = v as string;
    }
  }
  const t = (key: string, options?: any) => {
    let base = (i18nMap[key] ?? key) as string;
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
      if (!didReplace) {
        const keys = Object.keys(options);
        if (keys.length === 1) {
          base = `${base} ${String((options as any)[keys[0]])}`;
        } else {
          base = `${base}:${JSON.stringify(options)}`;
        }
      }
    } else {
      const strVal = String(options);
      if (!tryReplace('0', strVal)) {
        base = `${base} ${strVal}`;
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

vi.mock('@/store', () => ({
  useNotificationStore: () => ({
    addNotification: mockAddNotification,
  }),
}));

vi.mock('@/components/mobile', () => ({
  MobileButton: ({
    children,
    onClick,
    startIcon,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    startIcon?: React.ReactNode;
  }) => (
    <button
      type='button'
      onClick={onClick}
    >
      {startIcon}
      {children}
    </button>
  ),
  MobileCard: ({
    title,
    subtitle,
    rightContent,
    badge,
    children,
  }: {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    rightContent?: React.ReactNode;
    badge?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div role='article'>
      <div>{title}</div>
      <div>{subtitle}</div>
      <div>{rightContent}</div>
      <div>{badge}</div>
      {children}
    </div>
  ),
  SwipeAction: ({
    children,
    rightActions = [],
  }: {
    children: React.ReactNode;
    rightActions?: Array<{ id: string; label: string; onClick: () => void }>;
  }) => (
    <div>
      {children}
      {rightActions.map((action) => (
        <button
          key={action.id}
          type='button'
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../../hooks/useMobileApproval', async () => {
  const ReactModule = await import('react');
  return {
    getTypeIcon: () => ReactModule.createElement('span', null, 'type-icon'),
    getTypeColor: () => 'primary',
    getPriorityColor: (priority: ApprovalItem['priority']) =>
      priority === 'high' ? 'error' : priority === 'medium' ? 'warning' : 'success',
    getPriorityLabel: (priority: ApprovalItem['priority'], t: (key: string) => string) =>
      priority === 'high'
        ? t('mobile.approval.priority.urgent')
        : priority === 'medium'
          ? t('mobile.approval.priority.normal')
          : t('mobile.approval.priority.low'),
  };
});

const pendingOrder: ProductionOrder = {
  id: 'order-1',
  orderNo: 'MO-001',
  product_name: '智能传感器',
  quantity: 100,
  completed_quantity: 25,
  status: 'pending',
  workstation: 'WS-01',
  due_date: '2026-08-15',
  created_at: '2026-08-01T08:00:00Z',
};

const inProgressOrder: ProductionOrder = {
  ...pendingOrder,
  id: 'order-2',
  orderNo: 'MO-002',
  product_name: '控制器',
  completed_quantity: 50,
  status: 'in_progress',
};

const pausedOrder: ProductionOrder = {
  ...pendingOrder,
  id: 'order-3',
  orderNo: 'MO-003',
  status: 'paused',
};

const completedOrder: ProductionOrder = {
  ...pendingOrder,
  id: 'order-4',
  orderNo: 'MO-004',
  completed_quantity: 100,
  status: 'completed',
};

const workReports: WorkReport[] = [
  {
    id: 'report-1',
    order_id: 'order-2',
    orderNo: 'MO-002',
    workstation: 'WS-02',
    operator: '王工',
    quantity: 60,
    good_quantity: 58,
    bad_quantity: 2,
    start_time: '2026-08-11T08:00:00Z',
    end_time: '2026-08-11T10:05:00Z',
    duration: 125,
    created_at: '2026-08-11T10:05:00Z',
  },
];

const equipmentList: Equipment[] = [
  {
    id: 'equipment-1',
    equipment_no: 'EQ-001',
    name: '贴片机',
    type: 'machine',
    status: 'running',
    location: '一车间',
    running_hours: 1234,
  },
];

const approval: ApprovalItem = {
  id: 'APP-001',
  title: '采购审批',
  type: 'purchase',
  applicant: '李雷',
  department: '采购部',
  submitTime: '2026-08-11 09:30',
  amount: '¥12,000',
  priority: 'high',
  status: 'pending',
  description: '采购传感器备件',
  steps: [],
};

const renderProductionCard = (
  overrides?: Partial<React.ComponentProps<typeof MobileProductionCard>>
) =>
  renderWithProviders(
    <MobileProductionCard
      activeTab={0}
      filteredOrders={[pendingOrder]}
      workReports={workReports}
      equipmentList={equipmentList}
      onOrderAction={vi.fn()}
      onStartReport={vi.fn()}
      {...overrides}
    />
  );

describe('MobileProductionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts a pending order', () => {
    const onOrderAction = vi.fn();
    renderWithProviders(
      <MobileProductionActions
        order={pendingOrder}
        onOrderAction={onOrderAction}
        onStartReport={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('mobile.production.action.start'));
    expect(onOrderAction).toHaveBeenCalledWith(pendingOrder, 'start');
  });

  it('pauses and reports an in-progress order', () => {
    const onOrderAction = vi.fn();
    const onStartReport = vi.fn();
    renderWithProviders(
      <MobileProductionActions
        order={inProgressOrder}
        onOrderAction={onOrderAction}
        onStartReport={onStartReport}
      />
    );

    fireEvent.click(screen.getByText('mobile.production.action.pause'));
    fireEvent.click(screen.getByText('mobile.production.action.report'));

    expect(onOrderAction).toHaveBeenCalledWith(inProgressOrder, 'pause');
    expect(onStartReport).toHaveBeenCalledWith(inProgressOrder);
  });

  it('resumes a paused order', () => {
    const onOrderAction = vi.fn();
    renderWithProviders(
      <MobileProductionActions
        order={pausedOrder}
        onOrderAction={onOrderAction}
        onStartReport={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('mobile.production.action.continue'));
    expect(onOrderAction).toHaveBeenCalledWith(pausedOrder, 'resume');
  });

  it('shows detail notification for a completed order', () => {
    renderWithProviders(
      <MobileProductionActions
        order={completedOrder}
        onOrderAction={vi.fn()}
        onStartReport={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('mobile.production.action.detail'));
    expect(mockAddNotification).toHaveBeenCalledWith({
      title: 'mobile.production.action.view_detail',
      message: 'mobile.production.action.view_order_detail',
      type: 'info',
    });
  });
});

describe('MobileProductionFilters', () => {
  it('renders tabs and search input on the order tab', () => {
    renderWithProviders(
      <MobileProductionFilters
        activeTab={0}
        onTabChange={vi.fn()}
        searchQuery='MO'
        onSearchChange={vi.fn()}
      />
    );

    expect(screen.getByText('mobile.production.tabs.orders')).toBeInTheDocument();
    expect(screen.getByText('mobile.production.tabs.reports')).toBeInTheDocument();
    expect(screen.getByText('mobile.production.tabs.equipment')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MO')).toBeInTheDocument();
  });

  it('emits search changes and tab changes', () => {
    const onSearchChange = vi.fn();
    const onTabChange = vi.fn();
    renderWithProviders(
      <MobileProductionFilters
        activeTab={0}
        onTabChange={onTabChange}
        searchQuery=''
        onSearchChange={onSearchChange}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('mobile.production.search_placeholder'), {
      target: { value: 'MO-001' },
    });
    fireEvent.click(screen.getByText('mobile.production.tabs.reports'));

    expect(onSearchChange).toHaveBeenCalledWith('MO-001');
    expect(onTabChange).toHaveBeenCalled();
  });

  it('hides search outside the order tab or when disabled', () => {
    const { rerender } = renderWithProviders(
      <MobileProductionFilters
        activeTab={1}
        onTabChange={vi.fn()}
        searchQuery=''
        onSearchChange={vi.fn()}
      />
    );

    expect(
      screen.queryByPlaceholderText('mobile.production.search_placeholder')
    ).not.toBeInTheDocument();

    rerender(
      <MobileProductionFilters
        activeTab={0}
        onTabChange={vi.fn()}
        searchQuery=''
        onSearchChange={vi.fn()}
        showSearch={false}
      />
    );

    expect(
      screen.queryByPlaceholderText('mobile.production.search_placeholder')
    ).not.toBeInTheDocument();
  });
});

describe('MobileProductionCard', () => {
  it('renders order cards with progress and action controls', () => {
    const onOrderAction = vi.fn();
    renderProductionCard({
      filteredOrders: [pendingOrder, inProgressOrder],
      onOrderAction,
    });

    expect(screen.getByText('智能传感器')).toBeInTheDocument();
    expect(screen.getByText('MO-001')).toBeInTheDocument();
    expect(screen.getByText('25.0%')).toBeInTheDocument();
    expect(screen.getByText('控制器')).toBeInTheDocument();

    fireEvent.click(screen.getByText('mobile.production.action.start'));
    expect(onOrderAction).toHaveBeenCalledWith(pendingOrder, 'start');
  });

  it('renders work reports on the reports tab', () => {
    renderProductionCard({ activeTab: 1 });

    expect(screen.getByText('MO-002')).toBeInTheDocument();
    expect(screen.getByText('WS-02')).toBeInTheDocument();
    expect(screen.getByText('mobile.production.label.qualified_count 58')).toBeInTheDocument();
    expect(screen.getByText('mobile.production.label.defective_count 2')).toBeInTheDocument();
    expect(screen.getByText('2h5m')).toBeInTheDocument();
  });

  it('renders equipment on the equipment tab', () => {
    renderProductionCard({ activeTab: 2 });

    expect(screen.getByText('贴片机')).toBeInTheDocument();
    expect(screen.getByText('EQ-001 · 一车间')).toBeInTheDocument();
    expect(screen.getByText('mobile.production.status.running')).toBeInTheDocument();
    expect(screen.getByText('1,234h')).toBeInTheDocument();
  });
});

describe('ApprovalCard', () => {
  it('renders approval summary and calls click handlers', () => {
    const onClick = vi.fn();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    renderWithProviders(
      <ApprovalCard
        approval={approval}
        onClick={onClick}
        onApprove={onApprove}
        onReject={onReject}
      />
    );

    expect(screen.getByText('采购审批')).toBeInTheDocument();
    expect(screen.getByText('APP-001')).toBeInTheDocument();
    expect(screen.getByText('李雷')).toBeInTheDocument();
    expect(screen.getByText('2026-08-11')).toBeInTheDocument();
    expect(screen.getByText('¥12,000')).toBeInTheDocument();

    fireEvent.click(screen.getByText('采购审批'));
    fireEvent.click(screen.getByText('mobile.approval.action.approve'));
    fireEvent.click(screen.getByText('mobile.approval.action.reject'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('renders without optional amount and fallback swipe handlers', () => {
    renderWithProviders(
      <ApprovalCard
        approval={{ ...approval, amount: undefined, priority: 'low' }}
        onClick={vi.fn()}
      />
    );

    expect(screen.getByText('mobile.approval.priority.low')).toBeInTheDocument();
    expect(screen.queryByText('¥12,000')).not.toBeInTheDocument();
    expect(() => fireEvent.click(screen.getByText('mobile.approval.action.approve'))).not.toThrow();
    expect(() => fireEvent.click(screen.getByText('mobile.approval.action.reject'))).not.toThrow();
  });
});

describe('MobileQualitySearchBar', () => {
  it('renders the current query and emits search changes', () => {
    const onSearchChange = vi.fn();
    renderWithProviders(
      <MobileQualitySearchBar
        searchQuery='IQC'
        onSearchChange={onSearchChange}
      />
    );

    const input = screen.getByPlaceholderText('mobile.quality.search_placeholder');
    expect(input).toHaveValue('IQC');

    fireEvent.change(input, { target: { value: 'FQC' } });
    expect(onSearchChange).toHaveBeenCalledWith('FQC');
  });
});
