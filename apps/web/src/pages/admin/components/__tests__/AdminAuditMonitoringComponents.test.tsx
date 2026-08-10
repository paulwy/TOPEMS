import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import OperationAuditLogFilter from '../OperationAuditLogFilter';
import { MonitoringAlertRuleForm } from '../MonitoringAlertRuleForm';
import { MonitoringAlertTable } from '../MonitoringAlertTable';
import type { Alert, AlertRule } from '@/api/admin/monitoring';

const mockListPageTemplate = vi.hoisted(() => vi.fn());

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('lucide-react', () => ({
  AlertCircle: () => <span data-testid='alert-circle-icon' />,
  AlertTriangle: () => <span data-testid='alert-triangle-icon' />,
  Bell: () => <span data-testid='bell-icon' />,
  Calendar: () => <span data-testid='calendar-icon' />,
  Clock: () => <span data-testid='clock-icon' />,
  Search: () => <span data-testid='search-icon' />,
  X: () => <span data-testid='x-icon' />,
}));

vi.mock('@/components/templates/ListPageTemplate', () => ({
  default: (props: Record<string, any>) => {
    mockListPageTemplate(props);
    const rows = props.data as Alert[];
    return (
      <div data-testid='list-page-template'>
        <div data-testid='header-content'>{props.headerContent}</div>
        <div data-testid='filter-content'>{props.filterContent}</div>
        {props.loading && <div>loading</div>}
        {rows.length === 0 && !props.loading && <div>{props.emptyMessage}</div>}
        {rows.map((row) => (
          <div
            key={row.id}
            data-testid={`row-${row.id}`}
          >
            {props.columns.map((column: any) => (
              <div key={column.id}>{column.render(row)}</div>
            ))}
            {props.rowActions
              .filter((action: any) => !action.show || action.show(row))
              .map((action: any) => (
                <button
                  key={action.key}
                  type='button'
                  onClick={() => action.onClick(row)}
                >
                  {action.label}
                </button>
              ))}
          </div>
        ))}
        <button
          type='button'
          onClick={() => props.pagination.onPageChange(2)}
        >
          go-page-3
        </button>
        <button
          type='button'
          onClick={props.onRefresh}
        >
          refresh
        </button>
      </div>
    );
  },
}));

const alertRules: AlertRule = {
  id: 'rule-1',
  name: 'CPU 告警',
  type: 'performance',
  severity: 'high',
  level: 'critical',
  condition: 'cpu > 90',
  notification_channels: ['email'],
  enabled: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const alerts: Alert[] = [
  {
    id: 'alert-1',
    type: 'performance',
    severity: 'critical',
    level: 'critical',
    status: 'pending',
    title: 'CPU 过高',
    description: 'CPU 使用率超过阈值',
    message: 'CPU 使用率达到 95%',
    source: 'monitor',
    created_at: '2024-01-01T08:00:00Z',
    updated_at: '2024-01-01T08:00:00Z',
  },
  {
    id: 'alert-2',
    type: 'system',
    severity: 'high',
    level: 'warning',
    status: 'acknowledged',
    title: '磁盘空间不足',
    description: '磁盘剩余空间不足',
    message: '磁盘剩余空间低于 10%',
    source: 'storage',
    created_at: '2024-01-02T08:00:00Z',
    updated_at: '2024-01-02T08:00:00Z',
  },
  {
    id: 'alert-3',
    type: 'business',
    severity: 'low',
    level: 'custom',
    status: 'resolved',
    title: '自定义告警',
    description: '自定义状态',
    message: '自定义告警内容',
    source: 'custom',
    created_at: '2024-01-03T08:00:00Z',
    updated_at: '2024-01-03T08:00:00Z',
  },
];

describe('OperationAuditLogFilter', () => {
  const defaultProps = {
    userFilter: 'admin',
    setUserFilter: vi.fn(),
    moduleFilter: 'crm',
    setModuleFilter: vi.fn(),
    operationFilter: 'create',
    setOperationFilter: vi.fn(),
    resourceTypeFilter: 'customer',
    setResourceTypeFilter: vi.fn(),
    traceIdFilter: 'trace-1',
    setTraceIdFilter: vi.fn(),
    successFilter: 'true' as const,
    setSuccessFilter: vi.fn(),
    startDate: '2024-01-01T00:00',
    setStartDate: vi.fn(),
    endDate: '2024-01-02T00:00',
    setEndDate: vi.fn(),
    setPage: vi.fn(),
    moduleOptions: [
      { value: 'crm', label: 'CRM' },
      { value: 'erp', label: 'ERP' },
    ],
    operationOptions: [
      { value: 'create', label: '创建' },
      { value: 'delete', label: '删除' },
    ],
    clearFilters: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active filters and clears them', () => {
    render(<OperationAuditLogFilter {...defaultProps} />);

    expect(screen.getByDisplayValue('admin')).toBeInTheDocument();
    expect(screen.getByDisplayValue('customer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('trace-1')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'admin.operation_audit_log_page.text_a95500' })
    );

    expect(defaultProps.clearFilters).toHaveBeenCalledTimes(1);
  });

  it('emits text and date filter changes while resetting page', () => {
    render(<OperationAuditLogFilter {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('admin.operation_audit_log.filter_by_username'), {
      target: { value: 'operator' },
    });
    fireEvent.change(screen.getByPlaceholderText('admin.operation_audit_log.resource_type'), {
      target: { value: 'order' },
    });
    fireEvent.change(screen.getByPlaceholderText('admin.operation_audit_log_page.attr_22c443'), {
      target: { value: 'trace-2' },
    });
    fireEvent.change(screen.getByLabelText('admin.operation_audit_log.start_time'), {
      target: { value: '2024-02-01T10:00' },
    });
    fireEvent.change(screen.getByLabelText('admin.operation_audit_log.end_time'), {
      target: { value: '2024-02-02T10:00' },
    });

    expect(defaultProps.setUserFilter).toHaveBeenCalledWith('operator');
    expect(defaultProps.setResourceTypeFilter).toHaveBeenCalledWith('order');
    expect(defaultProps.setTraceIdFilter).toHaveBeenCalledWith('trace-2');
    expect(defaultProps.setStartDate).toHaveBeenCalledWith('2024-02-01T10:00');
    expect(defaultProps.setEndDate).toHaveBeenCalledWith('2024-02-02T10:00');
    expect(defaultProps.setPage).toHaveBeenCalledTimes(5);
    expect(defaultProps.setPage).toHaveBeenCalledWith(0);
  });

  it('emits module, operation and success select changes', () => {
    render(<OperationAuditLogFilter {...defaultProps} />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.mouseDown(selects[0]);
    fireEvent.click(screen.getByRole('option', { name: 'ERP' }));
    fireEvent.mouseDown(selects[1]);
    fireEvent.click(screen.getByRole('option', { name: '删除' }));
    fireEvent.mouseDown(selects[2]);
    fireEvent.click(screen.getByRole('option', { name: 'admin.operation_audit_log.failed' }));

    expect(defaultProps.setModuleFilter).toHaveBeenCalledWith('erp');
    expect(defaultProps.setOperationFilter).toHaveBeenCalledWith('delete');
    expect(defaultProps.setSuccessFilter).toHaveBeenCalledWith('false');
    expect(defaultProps.setPage).toHaveBeenCalledTimes(3);
  });

  it('hides clear button when no filters are active', () => {
    render(
      <OperationAuditLogFilter
        {...defaultProps}
        userFilter=''
        moduleFilter=''
        operationFilter=''
        resourceTypeFilter=''
        traceIdFilter=''
        successFilter=''
        startDate=''
        endDate=''
      />
    );

    expect(
      screen.queryByRole('button', { name: 'admin.operation_audit_log_page.text_a95500' })
    ).not.toBeInTheDocument();
  });
});

describe('MonitoringAlertRuleForm', () => {
  it('renders create mode and saves empty create payload', () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    render(
      <MonitoringAlertRuleForm
        open
        editingRule={null}
        onClose={onClose}
        onSave={onSave}
      />
    );

    expect(screen.getByText('admin.monitoring_alert.add_alert_rule')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'admin.monitoring_alert.cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'admin.monitoring_alert.create' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({ data: {} });
  });

  it('renders edit mode defaults and saves with rule id', () => {
    const onSave = vi.fn();
    render(
      <MonitoringAlertRuleForm
        open
        editingRule={alertRules}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    expect(screen.getByDisplayValue('CPU 告警')).toBeInTheDocument();
    expect(screen.getByDisplayValue('cpu > 90')).toBeInTheDocument();
    expect(screen.getByText('+ admin.monitoring_alert.edit_alert_rule +')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+ admin.monitoring_alert.save +' }));

    expect(onSave).toHaveBeenCalledWith({ id: 'rule-1', data: {} });
  });
});

describe('MonitoringAlertTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes table props and renders alert columns through template', () => {
    render(
      <MonitoringAlertTable
        alerts={alerts}
        loading={false}
        total={60}
        currentPage={2}
        onAcknowledge={vi.fn()}
        onResolve={vi.fn()}
        onEscalate={vi.fn()}
        onRefresh={vi.fn()}
        onPageChange={vi.fn()}
        filterContent={<span>filter-slot</span>}
        headerContent={<span>header-slot</span>}
      />
    );

    expect(screen.getByTestId('list-page-template')).toBeInTheDocument();
    expect(screen.getByText('header-slot')).toBeInTheDocument();
    expect(screen.getByText('filter-slot')).toBeInTheDocument();
    expect(screen.getByText('CPU 过高')).toBeInTheDocument();
    expect(screen.getByText('admin.monitoring_alert.critical')).toBeInTheDocument();
    expect(screen.getByText('admin.monitoring_alert.pending')).toBeInTheDocument();
    expect(screen.getAllByText('custom')).toHaveLength(2);

    const props = mockListPageTemplate.mock.calls[0][0];
    expect(props.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 20,
        total: 60,
      })
    );
    expect(props.exportable).toBe(false);
    expect(props.showRowNumber).toBe(false);
  });

  it('emits row actions, refresh and one-based page changes', () => {
    const onAcknowledge = vi.fn();
    const onResolve = vi.fn();
    const onEscalate = vi.fn();
    const onRefresh = vi.fn();
    const onPageChange = vi.fn();
    render(
      <MonitoringAlertTable
        alerts={alerts}
        loading={false}
        total={60}
        currentPage={1}
        onAcknowledge={onAcknowledge}
        onResolve={onResolve}
        onEscalate={onEscalate}
        onRefresh={onRefresh}
        onPageChange={onPageChange}
        filterContent={null}
        headerContent={null}
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'admin.monitoring_alert_page.text_e83a25' })
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'admin.monitoring_alert_page.text_4b8621' })
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: 'admin.monitoring_alert_page.text_e643c7' })[0]
    );
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'go-page-3' }));

    expect(onAcknowledge).toHaveBeenCalledWith('alert-1');
    expect(onResolve).toHaveBeenCalledWith('alert-2');
    expect(onEscalate).toHaveBeenCalledWith('alert-1');
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('uses empty data while loading', () => {
    render(
      <MonitoringAlertTable
        alerts={alerts}
        loading
        total={0}
        currentPage={1}
        onAcknowledge={vi.fn()}
        onResolve={vi.fn()}
        onEscalate={vi.fn()}
        onRefresh={vi.fn()}
        onPageChange={vi.fn()}
        filterContent={null}
        headerContent={null}
      />
    );

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(mockListPageTemplate.mock.calls[0][0].data).toEqual([]);
  });
});
