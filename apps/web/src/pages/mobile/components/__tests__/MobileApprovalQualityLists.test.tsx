import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '@/__tests__/test-utils';

import { ApprovalFilter } from '../ApprovalFilter';
import { ApprovalList } from '../ApprovalList';
import { MobileQualityDefectList } from '../MobileQualityDefectList';
import { MobileQualityTaskList } from '../MobileQualityTaskList';
import type { DefectRecord, QualityTask } from '@/api/mobile';
import type { ApprovalItem } from '../../hooks/UseMobileApproval';

const mockAddNotification = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => {
  const sources = [
    require('../../../../i18n/locales/zh/common.json'),
    require('../../../../i18n/locales/zh/components.json'),
    require('../../../../i18n/locales/zh/pages.json'),
    require('../../../../i18n/locales/zh/templates.json'),
    require('../../../../i18n/locales/zh/qms.json'),
    require('../../../../i18n/locales/zh/shared.json'),
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
    require('../../../../i18n/locales/zh/qms.json'),
    require('../../../../i18n/locales/zh/shared.json'),
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
  PullToRefresh: ({ children }: { children: React.ReactNode; onRefresh?: () => Promise<void> }) => (
    <div data-testid='pull-to-refresh'>{children}</div>
  ),
  MobileSkeleton: ({ count }: { type?: string; count?: number }) => (
    <div data-testid='mobile-skeleton'>skeleton-{count}</div>
  ),
  MobileButton: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button
      type='button'
      onClick={onClick}
    >
      {children}
    </button>
  ),
}));

vi.mock('../ApprovalCard', () => ({
  ApprovalCard: ({
    approval,
    onClick,
    onApprove,
    onReject,
  }: {
    approval: ApprovalItem;
    onClick: () => void;
    onApprove?: () => void;
    onReject?: () => void;
  }) => (
    <article>
      <button
        type='button'
        onClick={onClick}
      >
        {approval.title}
      </button>
      <span>{approval.id}</span>
      <button
        type='button'
        onClick={onApprove}
      >
        approve-{approval.id}
      </button>
      <button
        type='button'
        onClick={onReject}
      >
        reject-{approval.id}
      </button>
    </article>
  ),
}));

const approval: ApprovalItem = {
  id: 'APP-101',
  title: '合同审批',
  type: 'contract',
  applicant: '韩梅梅',
  department: '法务部',
  submitTime: '2026-08-11 10:00',
  priority: 'medium',
  status: 'pending',
  description: '合同审批说明',
  steps: [],
};

const pendingTask: QualityTask = {
  id: 'task-1',
  task_no: 'QC-001',
  type: 'incoming',
  product_name: '工业网关',
  batch_no: 'B-001',
  quantity: 1500,
  status: 'pending',
  inspector: '质检员A',
  due_date: '2026-08-20',
  created_at: '2026-08-10T08:00:00Z',
};

const inProgressTask: QualityTask = {
  ...pendingTask,
  id: 'task-2',
  task_no: 'QC-002',
  product_name: '边缘控制器',
  status: 'in_progress',
};

const passedTask: QualityTask = {
  ...pendingTask,
  id: 'task-3',
  task_no: 'QC-003',
  status: 'passed',
};

const defect: DefectRecord = {
  id: 'defect-1',
  task_id: 'task-2',
  product_name: '边缘控制器',
  batch_no: 'B-002',
  defect_type: '外观划痕',
  severity: 'major',
  quantity: 3,
  description: '外壳边缘存在明显划痕',
  reporter: '质检员B',
  reported_at: '2026-08-11T09:30:00Z',
  status: 'processing',
};

describe('ApprovalFilter', () => {
  it('renders search input, tabs, and pending badge', () => {
    renderWithProviders(
      <ApprovalFilter
        searchQuery='合同'
        onSearchChange={vi.fn()}
        activeTab={0}
        onTabChange={vi.fn()}
        tabs={['待审批', '已审批', '我发起']}
        pendingCount={7}
      />
    );

    expect(screen.getByDisplayValue('合同')).toBeInTheDocument();
    expect(screen.getByText('待审批')).toBeInTheDocument();
    expect(screen.getByText('已审批')).toBeInTheDocument();
    expect(screen.getByText('我发起')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});

describe('ApprovalList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton while approvals are loading', () => {
    renderWithProviders(
      <ApprovalList
        loading
        filteredApprovals={[]}
        searchQuery=''
        onRefresh={vi.fn()}
        onApprovalClick={vi.fn()}
      />
    );

    expect(screen.getByTestId('mobile-skeleton')).toHaveTextContent('skeleton-6');
  });

  it('renders empty state messages for empty and searched lists', () => {
    const { rerender } = renderWithProviders(
      <ApprovalList
        loading={false}
        filteredApprovals={[]}
        searchQuery=''
        onRefresh={vi.fn()}
        onApprovalClick={vi.fn()}
      />
    );

    expect(screen.getByText('mobile.approval.status.empty')).toBeInTheDocument();
    expect(screen.getByText('mobile.approval.status.empty_desc')).toBeInTheDocument();

    rerender(
      <ApprovalList
        loading={false}
        filteredApprovals={[]}
        searchQuery='合同'
        onRefresh={vi.fn()}
        onApprovalClick={vi.fn()}
      />
    );

    expect(screen.getByText(/mobile\.approval\.status\.no_match/)).toBeInTheDocument();
  });

  it('renders approval cards and forwards item actions', () => {
    const onApprovalClick = vi.fn();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    renderWithProviders(
      <ApprovalList
        loading={false}
        filteredApprovals={[approval]}
        searchQuery=''
        onRefresh={vi.fn()}
        onApprovalClick={onApprovalClick}
        onApprove={onApprove}
        onReject={onReject}
      />
    );

    fireEvent.click(screen.getByText('合同审批'));
    fireEvent.click(screen.getByText('approve-APP-101'));
    fireEvent.click(screen.getByText('reject-APP-101'));

    expect(onApprovalClick).toHaveBeenCalledWith(approval);
    expect(onApprove).toHaveBeenCalledWith(approval);
    expect(onReject).toHaveBeenCalledWith(approval);
  });
});

describe('MobileQualityTaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseProps = {
    getTypeLabel: (type: string) => `type-${type}`,
    getStatusLabel: (status: string) => `status-${status}`,
    getStatusColor: () => 'primary' as const,
    onTaskAction: vi.fn(),
    onReportDefect: vi.fn(),
  };

  it('renders quality task details and starts pending tasks', () => {
    const onTaskAction = vi.fn();
    renderWithProviders(
      <MobileQualityTaskList
        {...baseProps}
        filteredTasks={[pendingTask]}
        onTaskAction={onTaskAction}
      />
    );

    expect(screen.getByText('工业网关')).toBeInTheDocument();
    expect(screen.getByText('QC-001')).toBeInTheDocument();
    expect(screen.getByText('B-001')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('质检员A')).toBeInTheDocument();

    fireEvent.click(screen.getByText('mobile.quality.action.start_inspection'));
    expect(onTaskAction).toHaveBeenCalledWith(pendingTask, 'start');
  });

  it('reports defects and passes in-progress tasks', () => {
    const onTaskAction = vi.fn();
    const onReportDefect = vi.fn();
    renderWithProviders(
      <MobileQualityTaskList
        {...baseProps}
        filteredTasks={[inProgressTask]}
        onTaskAction={onTaskAction}
        onReportDefect={onReportDefect}
      />
    );

    fireEvent.click(screen.getByText('mobile.quality.action.report_defect'));
    fireEvent.click(screen.getByText('mobile.quality.action.pass'));

    expect(onReportDefect).toHaveBeenCalledWith(inProgressTask);
    expect(onTaskAction).toHaveBeenCalledWith(inProgressTask, 'pass');
  });

  it('opens inspection report notification for finished tasks', () => {
    renderWithProviders(
      <MobileQualityTaskList
        {...baseProps}
        filteredTasks={[passedTask]}
      />
    );

    fireEvent.click(screen.getByText('mobile.quality.action.view_report'));
    expect(mockAddNotification).toHaveBeenCalledWith({
      title: 'mobile.quality.action.view_report',
      message: 'mobile.quality.action.view_inspection_detail',
      type: 'info',
    });
  });
});

describe('MobileQualityDefectList', () => {
  it('renders defect details with severity and status labels', () => {
    renderWithProviders(
      <MobileQualityDefectList
        defectRecords={[defect]}
        getSeverityLabel={(severity) => `severity-${severity}`}
        getSeverityColor={() => 'warning'}
        getStatusLabel={(status) => `status-${status}`}
        getStatusColor={() => 'primary'}
      />
    );

    expect(screen.getByText('外观划痕')).toBeInTheDocument();
    expect(screen.getByText('边缘控制器')).toBeInTheDocument();
    expect(screen.getByText('severity-major')).toBeInTheDocument();
    expect(screen.getByText('mobile.quality.label.batch_value B-002')).toBeInTheDocument();
    expect(screen.getByText('mobile.quality.label.quantity_value 3')).toBeInTheDocument();
    expect(screen.getByText('外壳边缘存在明显划痕')).toBeInTheDocument();
    expect(screen.getByText('质检员B · 2026/8/11')).toBeInTheDocument();
    expect(screen.getByText('status-processing')).toBeInTheDocument();
  });
});
