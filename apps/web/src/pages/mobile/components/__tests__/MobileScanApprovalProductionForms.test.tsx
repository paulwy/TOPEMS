import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '@/__tests__/test-utils';

import { ApprovalDetail } from '../ApprovalDetail';
import ManualInput from '../ManualInput';
import { MobileProductionReportDialog } from '../MobileProductionReportDialog';
import type { ProductionOrder } from '@/api/mobile';
import type { ApprovalItem } from '../../hooks/useMobileApproval';
import type { ReportForm } from '../../hooks/useMobileProduction';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/mobile', () => ({
  MobileButton: ({
    children,
    onClick,
    disabled,
    startIcon,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    startIcon?: React.ReactNode;
  }) => (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
    >
      {startIcon}
      {children}
    </button>
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

const approval: ApprovalItem = {
  id: 'APP-200',
  title: '费用报销审批',
  type: 'expense',
  applicant: '王五',
  department: '财务部',
  submitTime: '2026-08-11 11:20',
  amount: '¥8,888',
  priority: 'medium',
  status: 'pending',
  description: '差旅费用报销',
  steps: [
    { name: '提交申请', status: 'completed', time: '2026-08-10 09:00' },
    { name: '部门审批', status: 'current' },
    { name: '财务复核', status: 'pending' },
  ],
};

const productionOrder: ProductionOrder = {
  id: 'order-10',
  orderNo: 'MO-010',
  product_name: '智能控制柜',
  quantity: 200,
  completed_quantity: 80,
  status: 'in_progress',
  workstation: '总装线',
  due_date: '2026-08-20',
  created_at: '2026-08-10T08:00:00Z',
};

const reportForm: ReportForm = {
  quantity: 10,
  good_quantity: 9,
  bad_quantity: 1,
};

describe('ManualInput', () => {
  it('renders supported formats and disables confirm for blank input', () => {
    renderWithProviders(
      <ManualInput
        manualInput='   '
        onManualInputChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('mobile.scan.action.manual_input')).toBeInTheDocument();
    expect(screen.getByText('mobile.scan.status.manual_desc')).toBeInTheDocument();
    expect(screen.getByText('Code 128')).toBeInTheDocument();
    expect(screen.getByText('QR Code')).toBeInTheDocument();
    expect(screen.getByText('mobile.scan.action.confirm')).toBeDisabled();
  });

  it('emits input changes and submits via button or Enter', () => {
    const onManualInputChange = vi.fn();
    const onSubmit = vi.fn();
    renderWithProviders(
      <ManualInput
        manualInput='MAT-001'
        onManualInputChange={onManualInputChange}
        onSubmit={onSubmit}
      />
    );

    const input = screen.getByPlaceholderText('mobile.scan.field.input_placeholder');
    fireEvent.change(input, { target: { value: 'MAT-002' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(screen.getByText('mobile.scan.action.confirm'));

    expect(onManualInputChange).toHaveBeenCalledWith('MAT-002');
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});

describe('ApprovalDetail', () => {
  it('renders approval details, applicant, amount, description, and process', () => {
    renderWithProviders(
      <ApprovalDetail
        approval={approval}
        approvalComment='同意'
        onCommentChange={vi.fn()}
        processing={false}
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.getByText('费用报销审批')).toBeInTheDocument();
    expect(screen.getByText('APP-200')).toBeInTheDocument();
    expect(screen.getByText('mobile.approval.priority.normal')).toBeInTheDocument();
    expect(screen.getByText('¥8,888')).toBeInTheDocument();
    expect(screen.getByText('王五')).toBeInTheDocument();
    expect(screen.getByText('财务部')).toBeInTheDocument();
    expect(screen.getByText('差旅费用报销')).toBeInTheDocument();
    expect(screen.getByText('提交申请')).toBeInTheDocument();
    expect(screen.getByText('部门审批')).toBeInTheDocument();
    expect(screen.getByText('财务复核')).toBeInTheDocument();
    expect(screen.getByDisplayValue('同意')).toBeInTheDocument();
  });

  it('emits comment, approve, and reject actions', () => {
    const onCommentChange = vi.fn();
    const onApprove = vi.fn();
    const onReject = vi.fn();
    renderWithProviders(
      <ApprovalDetail
        approval={approval}
        approvalComment=''
        onCommentChange={onCommentChange}
        processing={false}
        onApprove={onApprove}
        onReject={onReject}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('mobile.approval.detail.opinion_placeholder'), {
      target: { value: '建议通过' },
    });
    fireEvent.click(screen.getByText('mobile.approval.action.reject'));
    fireEvent.click(screen.getByText('mobile.approval.action.approve'));

    expect(onCommentChange).toHaveBeenCalledWith('建议通过');
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  it('disables approval actions while processing and hides optional amount', () => {
    renderWithProviders(
      <ApprovalDetail
        approval={{ ...approval, amount: undefined }}
        approvalComment=''
        onCommentChange={vi.fn()}
        processing
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />
    );

    const loadingButtons = screen.getAllByText('mobile.approval.status.loading');
    expect(loadingButtons).toHaveLength(2);
    loadingButtons.forEach((button) => expect(button).toBeDisabled());
    expect(screen.queryByText('¥8,888')).not.toBeInTheDocument();
  });
});

describe('MobileProductionReportDialog', () => {
  it('renders selected order and report quantities', () => {
    renderWithProviders(
      <MobileProductionReportDialog
        open
        onClose={vi.fn()}
        selectedOrder={productionOrder}
        reportForm={reportForm}
        onReportFormChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('mobile.production.dialog.report_title')).toBeInTheDocument();
    expect(screen.getByText('智能控制柜')).toBeInTheDocument();
    expect(screen.getByText('MO-010 · 总装线')).toBeInTheDocument();
    expect(screen.getByLabelText('mobile.production.label.report_quantity')).toHaveValue(10);
    expect(screen.getByLabelText('mobile.production.label.good_quantity')).toHaveValue(9);
    expect(screen.getByLabelText('mobile.production.label.bad_quantity')).toHaveValue(1);
  });

  it('emits report form changes and dialog actions', () => {
    const onReportFormChange = vi.fn();
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    renderWithProviders(
      <MobileProductionReportDialog
        open
        onClose={onClose}
        selectedOrder={productionOrder}
        reportForm={reportForm}
        onReportFormChange={onReportFormChange}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByLabelText('mobile.production.label.report_quantity'), {
      target: { value: '12' },
    });
    fireEvent.change(screen.getByLabelText('mobile.production.label.good_quantity'), {
      target: { value: '11' },
    });
    fireEvent.change(screen.getByLabelText('mobile.production.label.bad_quantity'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByText('mobile.production.action.cancel'));
    fireEvent.click(screen.getByText('mobile.production.action.submit_report'));

    expect(onReportFormChange).toHaveBeenCalledWith({ ...reportForm, quantity: 12 });
    expect(onReportFormChange).toHaveBeenCalledWith({ ...reportForm, good_quantity: 11 });
    expect(onReportFormChange).toHaveBeenCalledWith({ ...reportForm, bad_quantity: 2 });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders without selected order context', () => {
    renderWithProviders(
      <MobileProductionReportDialog
        open
        onClose={vi.fn()}
        selectedOrder={null}
        reportForm={reportForm}
        onReportFormChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.queryByText('mobile.production.label.current_order')).not.toBeInTheDocument();
    expect(screen.getByText('mobile.production.dialog.report_title')).toBeInTheDocument();
  });
});
