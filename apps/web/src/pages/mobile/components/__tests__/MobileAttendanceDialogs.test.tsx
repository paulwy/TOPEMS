import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, renderWithProviders, screen } from '@/__tests__/test-utils';

import { AttendanceClockTab } from '../AttendanceClockTab';
import { AttendanceLeaveTab } from '../AttendanceLeaveTab';
import { AttendanceRecordsTab } from '../AttendanceRecordsTab';
import { LeaveApplicationDialog } from '../LeaveApplicationDialog';
import { MobileQualityDefectDialog } from '../MobileQualityDefectDialog';
import type {
  AttendanceRecord,
  AttendanceStats,
  LeaveApplication,
  QualityTask,
} from '@/api/mobile';
import type { LeaveForm } from '../../hooks/useMobileAttendance';
import type { DefectForm } from '../../hooks/useMobileQuality';

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
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
  MobileCard: ({
    title,
    subtitle,
    rightContent,
  }: {
    title?: React.ReactNode;
    subtitle?: React.ReactNode;
    rightContent?: React.ReactNode;
  }) => (
    <article>
      <div>{title}</div>
      <div>{subtitle}</div>
      <div>{rightContent}</div>
    </article>
  ),
}));

const attendanceStats: AttendanceStats = {
  today_status: 'checked_in',
  today_check_in: '08:30',
  today_check_out: undefined,
  work_days_this_month: 18,
  late_days_this_month: 2,
  early_leave_days: 1,
  absent_days: 0,
  total_work_hours: 144,
};

const attendanceRecord: AttendanceRecord = {
  id: 'record-1',
  user_id: 'user-1',
  user_name: '张三',
  date: '2026-08-11',
  check_in_time: '08:35',
  check_out_time: '18:05',
  work_hours: 8.5,
  status: 'late',
  type: 'check_in',
  created_at: '2026-08-11T08:35:00Z',
};

const leaveApplication: LeaveApplication = {
  id: 'leave-1',
  user_id: 'user-1',
  user_name: '张三',
  leave_type: 'annual',
  start_date: '2026-08-20',
  end_date: '2026-08-21',
  days: 2,
  reason: '家庭安排',
  status: 'pending',
  created_at: '2026-08-10T08:00:00Z',
};

const leaveForm: LeaveForm = {
  leave_type: 'annual',
  start_date: '2026-08-20',
  end_date: '2026-08-21',
  reason: '家庭安排',
};

const qualityTask: QualityTask = {
  id: 'task-1',
  task_no: 'QC-001',
  type: 'incoming',
  product_name: '工业网关',
  batch_no: 'B-001',
  quantity: 100,
  status: 'in_progress',
  inspector: '质检员A',
  due_date: '2026-08-20',
  created_at: '2026-08-10T08:00:00Z',
};

const defectForm: DefectForm = {
  defect_type: '外观划痕',
  severity: 'minor',
  quantity: 1,
  description: '外壳存在划痕',
};

describe('AttendanceClockTab', () => {
  it('renders clock, location, and monthly stats', () => {
    renderWithProviders(
      <AttendanceClockTab
        attendanceStats={attendanceStats}
        checkingIn={false}
        todayStatus='checked_in'
        onCheckIn={vi.fn()}
        onCheckOut={vi.fn()}
      />
    );

    expect(screen.getByText('下班打卡')).toBeInTheDocument();
    expect(screen.getByText('08:30')).toBeInTheDocument();
    expect(screen.getAllByText('--:--').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('考勤位置')).toBeInTheDocument();
    expect(screen.getByText('范围内')).toBeInTheDocument();
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('144h')).toBeInTheDocument();
  });
});

describe('AttendanceRecordsTab', () => {
  it('renders attendance records with status, times, and work hours', () => {
    renderWithProviders(<AttendanceRecordsTab records={[attendanceRecord]} />);

    expect(screen.getByText('2026-08-11')).toBeInTheDocument();
    expect(screen.getByText('迟到')).toBeInTheDocument();
    expect(screen.getByText('08:35 - 18:05')).toBeInTheDocument();
    expect(screen.getByText('8.5h')).toBeInTheDocument();
  });

  it('falls back to placeholder times and unknown status labels', () => {
    renderWithProviders(
      <AttendanceRecordsTab
        records={[
          {
            ...attendanceRecord,
            id: 'record-2',
            status: 'custom' as AttendanceRecord['status'],
            check_in_time: undefined,
            check_out_time: undefined,
            work_hours: undefined,
          },
        ]}
      />
    );

    expect(screen.getByText('custom')).toBeInTheDocument();
    expect(screen.getByText('--:-- - --:--')).toBeInTheDocument();
  });
});

describe('AttendanceLeaveTab', () => {
  it('renders empty leave state and opens the leave dialog', () => {
    const onOpenLeaveDialog = vi.fn();
    renderWithProviders(
      <AttendanceLeaveTab
        leaves={[]}
        onOpenLeaveDialog={onOpenLeaveDialog}
      />
    );

    expect(screen.getByText('暂无请假记录')).toBeInTheDocument();
    fireEvent.click(screen.getByText('申请请假'));
    expect(onOpenLeaveDialog).toHaveBeenCalledTimes(1);
  });

  it('renders leave application details', () => {
    renderWithProviders(
      <AttendanceLeaveTab
        leaves={[leaveApplication]}
        onOpenLeaveDialog={vi.fn()}
      />
    );

    expect(screen.getByText('年假')).toBeInTheDocument();
    expect(screen.getByText('待审批')).toBeInTheDocument();
    expect(screen.getByText('2天')).toBeInTheDocument();
    expect(screen.getByText('2026-08-20 至 2026-08-21')).toBeInTheDocument();
    expect(screen.getByText('家庭安排')).toBeInTheDocument();
  });
});

describe('LeaveApplicationDialog', () => {
  it('renders leave form fields and submits or cancels', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    renderWithProviders(
      <LeaveApplicationDialog
        open
        leaveForm={leaveForm}
        isSubmitting={false}
        onClose={onClose}
        onFormChange={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText('申请请假')).toBeInTheDocument();
    expect(screen.getByLabelText('开始日期')).toHaveValue('2026-08-20');
    expect(screen.getByLabelText('结束日期')).toHaveValue('2026-08-21');
    expect(screen.getByLabelText('请假原因')).toHaveValue('家庭安排');

    fireEvent.click(screen.getByText('取消'));
    fireEvent.click(screen.getByText('提交申请'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('emits leave form updater functions for edited fields', () => {
    const onFormChange = vi.fn();
    renderWithProviders(
      <LeaveApplicationDialog
        open
        leaveForm={leaveForm}
        isSubmitting={false}
        onClose={vi.fn()}
        onFormChange={onFormChange}
        onSubmit={vi.fn()}
      />
    );

    fireEvent.change(screen.getByDisplayValue('家庭安排'), {
      target: { value: '新的请假原因' },
    });

    expect(onFormChange).toHaveBeenCalled();
  });

  it('disables submit while submitting', () => {
    renderWithProviders(
      <LeaveApplicationDialog
        open
        leaveForm={leaveForm}
        isSubmitting
        onClose={vi.fn()}
        onFormChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('提交申请')).toBeDisabled();
  });
});

describe('MobileQualityDefectDialog', () => {
  it('renders selected task context and defect form fields', () => {
    renderWithProviders(
      <MobileQualityDefectDialog
        open
        onClose={vi.fn()}
        selectedTask={qualityTask}
        defectForm={defectForm}
        setDefectForm={vi.fn()}
        onSubmit={vi.fn()}
        submitting={false}
      />
    );

    expect(screen.getByText('上报缺陷')).toBeInTheDocument();
    expect(screen.getByText('工业网关')).toBeInTheDocument();
    expect(screen.getByText('QC-001 · 批次 B-001')).toBeInTheDocument();
    expect(screen.getByLabelText('缺陷类型')).toHaveValue('外观划痕');
    expect(screen.getByLabelText('缺陷数量')).toHaveValue(1);
    expect(screen.getByLabelText('缺陷描述')).toHaveValue('外壳存在划痕');
    expect(screen.getByText('拍照上传')).toBeInTheDocument();
  });

  it('emits defect form updater functions and submits', () => {
    const setDefectForm = vi.fn();
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    renderWithProviders(
      <MobileQualityDefectDialog
        open
        onClose={onClose}
        selectedTask={qualityTask}
        defectForm={defectForm}
        setDefectForm={setDefectForm}
        onSubmit={onSubmit}
        submitting={false}
      />
    );

    fireEvent.change(screen.getByDisplayValue('外观划痕'), {
      target: { value: '尺寸偏差' },
    });
    fireEvent.change(screen.getByDisplayValue('外壳存在划痕'), {
      target: { value: '尺寸超出公差' },
    });
    fireEvent.click(screen.getByText('取消'));
    fireEvent.click(screen.getByText('提交上报'));

    expect(setDefectForm).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('hides task context and disables actions while submitting', () => {
    renderWithProviders(
      <MobileQualityDefectDialog
        open
        onClose={vi.fn()}
        selectedTask={null}
        defectForm={defectForm}
        setDefectForm={vi.fn()}
        onSubmit={vi.fn()}
        submitting
      />
    );

    expect(screen.queryByText('当前任务')).not.toBeInTheDocument();
    expect(screen.getByText('取消')).toBeDisabled();
    expect(screen.getByText('提交上报')).toBeDisabled();
  });
});
