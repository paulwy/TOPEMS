import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusBadge } from '../StatusBadge';
import { FSMActionButtons } from '../FSMActionButtons';

describe('QMS StatusBadge', () => {
  it('renders inspection FSM statuses with correct labels', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='inspection'
        status='pending'
      />
    );
    expect(screen.getByText('待处理')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='inspection'
        status='in_progress'
      />
    );
    expect(screen.getByText('进行中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='inspection'
        status='pending_audit'
      />
    );
    expect(screen.getByText('待审核')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='inspection'
        status='completed'
      />
    );
    expect(screen.getByText('已完成')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='inspection'
        status='rejected'
      />
    );
    expect(screen.getByText('已驳回')).toBeInTheDocument();
  });

  it('renders issue FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='issue'
        status='open'
      />
    );
    expect(screen.getByText('待处理')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='issue'
        status='resolved'
      />
    );
    expect(screen.getByText('已解决')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='issue'
        status='closed'
      />
    );
    expect(screen.getByText('已关闭')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='issue'
        status='cancelled'
      />
    );
    expect(screen.getByText('已取消')).toBeInTheDocument();
  });

  it('renders action FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='action'
        status='pending'
      />
    );
    expect(screen.getByText('待处理')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='action'
        status='completed'
      />
    );
    expect(screen.getByText('已完成')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='action'
        status='verified'
      />
    );
    expect(screen.getByText('已验证')).toBeInTheDocument();
  });

  it('renders audit_plan FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='audit_plan'
        status='draft'
      />
    );
    expect(screen.getByText('草稿')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='audit_plan'
        status='scheduled'
      />
    );
    expect(screen.getByText('已排程')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='audit_plan'
        status='in_progress'
      />
    );
    expect(screen.getByText('进行中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='audit_plan'
        status='cancelled'
      />
    );
    expect(screen.getByText('已取消')).toBeInTheDocument();
  });

  it('renders audit_finding FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='audit_finding'
        status='open'
      />
    );
    expect(screen.getByText('待处理')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='audit_finding'
        status='verified'
      />
    );
    expect(screen.getByText('已验证')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='audit_finding'
        status='closed'
      />
    );
    expect(screen.getByText('已关闭')).toBeInTheDocument();
  });

  it('renders eight_d FSM statuses including root_cause', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='eight_d'
        status='initiated'
      />
    );
    expect(screen.getByText('已启动')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='eight_d'
        status='containment'
      />
    );
    expect(screen.getByText('临时措施')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='eight_d'
        status='root_cause'
      />
    );
    expect(screen.getByText('根因分析')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='eight_d'
        status='permanent_action'
      />
    );
    expect(screen.getByText('永久措施')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='eight_d'
        status='verified'
      />
    );
    expect(screen.getByText('已验证')).toBeInTheDocument();
  });

  it('renders apqp FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='apqp'
        status='planning'
      />
    );
    expect(screen.getByText('计划中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='apqp'
        status='in_design'
      />
    );
    expect(screen.getByText('设计中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='apqp'
        status='in_pilot'
      />
    );
    expect(screen.getByText('试点中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='apqp'
        status='in_production'
      />
    );
    expect(screen.getByText('生产中')).toBeInTheDocument();
  });

  it('renders unknown status with default gray color and raw text', () => {
    render(
      <StatusBadge
        fsm='inspection'
        status='unknown_status'
      />
    );
    expect(screen.getByText('unknown status')).toBeInTheDocument();
  });

  it('falls back to default color for status not in given FSM', () => {
    // closed 不属于 inspection FSM，应兜底为灰色
    render(
      <StatusBadge
        fsm='inspection'
        status='closed'
      />
    );
    const badge = screen.getByText('已关闭');
    expect(badge.className).toContain('bg-gray-100');
  });

  it('switches color classes across FSMs for same status value', () => {
    // completed 在 inspection = 绿色，在 action = 橙色
    const { unmount } = render(
      <StatusBadge
        fsm='inspection'
        status='completed'
      />
    );
    let badge = screen.getByText('已完成');
    expect(badge.className).toContain('bg-green-100');
    unmount();
    render(
      <StatusBadge
        fsm='action'
        status='completed'
      />
    );
    badge = screen.getByText('已完成');
    expect(badge.className).toContain('bg-orange-100');
  });

  it('uses custom label when provided', () => {
    render(
      <StatusBadge
        fsm='inspection'
        status='pending'
        label='自定义标签'
      />
    );
    expect(screen.getByText('自定义标签')).toBeInTheDocument();
  });
});

describe('QMS FSMActionButtons', () => {
  it('shows transitions for inspection pending status', () => {
    render(
      <FSMActionButtons
        fsm='inspection'
        currentStatus='pending'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('开始检验')).toBeInTheDocument();
  });

  it('marks inspection pending_audit transitions as approval', () => {
    render(
      <FSMActionButtons
        fsm='inspection'
        currentStatus='pending_audit'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/审核通过.*审批/)).toBeInTheDocument();
    expect(screen.getByText(/审核驳回.*审批/)).toBeInTheDocument();
  });

  it('shows no buttons for terminal status (inspection completed)', () => {
    const { container } = render(
      <FSMActionButtons
        fsm='inspection'
        currentStatus='completed'
        onAction={() => {}}
      />
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('renders eight_d full transition chain', () => {
    const { rerender } = render(
      <FSMActionButtons
        fsm='eight_d'
        currentStatus='initiated'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('启动团队')).toBeInTheDocument();
    rerender(
      <FSMActionButtons
        fsm='eight_d'
        currentStatus='root_cause'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('制定永久措施')).toBeInTheDocument();
  });

  it('marks apqp in_pilot → in_production as approval', () => {
    render(
      <FSMActionButtons
        fsm='apqp'
        currentStatus='in_pilot'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/进入生产.*审批/)).toBeInTheDocument();
  });

  it('calls onAction with targetStatus and requiresApproval flag', () => {
    const onAction = vi.fn();
    render(
      <FSMActionButtons
        fsm='issue'
        currentStatus='resolved'
        onAction={onAction}
      />
    );
    screen.getByText(/关闭.*审批/).click();
    expect(onAction).toHaveBeenCalledWith('closed', true);
  });

  it('calls onAction with requiresApproval=false for non-approval transition', () => {
    const onAction = vi.fn();
    render(
      <FSMActionButtons
        fsm='issue'
        currentStatus='open'
        onAction={onAction}
      />
    );
    screen.getByText('开始处理').click();
    expect(onAction).toHaveBeenCalledWith('in_progress', false);
  });

  it('disables all buttons when disabled prop is true', () => {
    render(
      <FSMActionButtons
        fsm='inspection'
        currentStatus='pending'
        onAction={() => {}}
        disabled
      />
    );
    screen.getAllByRole('button').forEach((btn) => expect(btn).toBeDisabled());
  });
});
