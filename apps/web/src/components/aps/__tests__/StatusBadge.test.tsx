import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusBadge } from '../StatusBadge';
import { FSMActionButtons } from '../FSMActionButtons';

describe('APS StatusBadge', () => {
  it('renders production_plan FSM statuses with correct labels', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='production_plan'
        status='draft'
      />
    );
    expect(screen.getByText('草稿')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='production_plan'
        status='pending_approval'
      />
    );
    expect(screen.getByText('待审批')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='production_plan'
        status='approved'
      />
    );
    expect(screen.getByText('已审批')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='production_plan'
        status='in_progress'
      />
    );
    expect(screen.getByText('进行中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='production_plan'
        status='completed'
      />
    );
    expect(screen.getByText('已完成')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='production_plan'
        status='cancelled'
      />
    );
    expect(screen.getByText('已取消')).toBeInTheDocument();
  });

  it('renders schedule FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='schedule'
        status='pending'
      />
    );
    expect(screen.getByText('待处理')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='schedule'
        status='released'
      />
    );
    expect(screen.getByText('已发布')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='schedule'
        status='running'
      />
    );
    expect(screen.getByText('运行中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='schedule'
        status='completed'
      />
    );
    expect(screen.getByText('已完成')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='schedule'
        status='cancelled'
      />
    );
    expect(screen.getByText('已取消')).toBeInTheDocument();
  });

  it('renders capacity FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='capacity'
        status='available'
      />
    );
    expect(screen.getByText('可用')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='capacity'
        status='allocated'
      />
    );
    expect(screen.getByText('已分配')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='capacity'
        status='consumed'
      />
    );
    expect(screen.getByText('已消耗')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='capacity'
        status='maintenance'
      />
    );
    expect(screen.getByText('维护中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='capacity'
        status='released'
      />
    );
    expect(screen.getByText('已发布')).toBeInTheDocument();
  });

  it('renders material_plan FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='material_plan'
        status='pending'
      />
    );
    expect(screen.getByText('待处理')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='material_plan'
        status='requisitioned'
      />
    );
    expect(screen.getByText('已请购')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='material_plan'
        status='sourced'
      />
    );
    expect(screen.getByText('已采购')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='material_plan'
        status='satisfied'
      />
    );
    expect(screen.getByText('已满足')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='material_plan'
        status='shortage'
      />
    );
    expect(screen.getByText('短缺')).toBeInTheDocument();
  });

  it('renders forecast FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='forecast'
        status='draft'
      />
    );
    expect(screen.getByText('草稿')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='forecast'
        status='calculated'
      />
    );
    expect(screen.getByText('已计算')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='forecast'
        status='validated'
      />
    );
    expect(screen.getByText('已验证')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='forecast'
        status='adopted'
      />
    );
    expect(screen.getByText('已采纳')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='forecast'
        status='superseded'
      />
    );
    expect(screen.getByText('已替代')).toBeInTheDocument();
  });

  it('renders unknown status with default gray color and raw text', () => {
    render(
      <StatusBadge
        fsm='production_plan'
        status='unknown_status'
      />
    );
    expect(screen.getByText('unknown status')).toBeInTheDocument();
  });

  it('falls back to default color for status not in given FSM', () => {
    render(
      <StatusBadge
        fsm='capacity'
        status='cancelled'
      />
    );
    const badge = screen.getByText('已取消');
    expect(badge.className).toContain('bg-gray-100');
  });

  it('switches color classes across FSMs for same status value', () => {
    const { unmount } = render(
      <StatusBadge
        fsm='production_plan'
        status='completed'
      />
    );
    let badge = screen.getByText('已完成');
    expect(badge.className).toContain('bg-green-100');
    unmount();
    render(
      <StatusBadge
        fsm='schedule'
        status='released'
      />
    );
    badge = screen.getByText('已发布');
    expect(badge.className).toContain('bg-blue-100');
  });

  it('uses custom label when provided', () => {
    render(
      <StatusBadge
        fsm='production_plan'
        status='draft'
        label='自定义标签'
      />
    );
    expect(screen.getByText('自定义标签')).toBeInTheDocument();
  });
});

describe('APS FSMActionButtons', () => {
  it('shows transitions for production_plan draft status', () => {
    render(
      <FSMActionButtons
        fsm='production_plan'
        currentStatus='draft'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('提交审批')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
  });

  it('marks production_plan pending_approval approve as approval', () => {
    render(
      <FSMActionButtons
        fsm='production_plan'
        currentStatus='pending_approval'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/审批通过.*审批/)).toBeInTheDocument();
  });

  it('shows no buttons for terminal status (production_plan completed)', () => {
    const { container } = render(
      <FSMActionButtons
        fsm='production_plan'
        currentStatus='completed'
        onAction={() => {}}
      />
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('renders capacity full transition chain', () => {
    const { rerender } = render(
      <FSMActionButtons
        fsm='capacity'
        currentStatus='available'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/分配.*审批/)).toBeInTheDocument();
    rerender(
      <FSMActionButtons
        fsm='capacity'
        currentStatus='allocated'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('消耗')).toBeInTheDocument();
    expect(screen.getByText('释放')).toBeInTheDocument();
  });

  it('marks schedule pending → released as approval', () => {
    render(
      <FSMActionButtons
        fsm='schedule'
        currentStatus='pending'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/发布.*审批/)).toBeInTheDocument();
  });

  it('marks material_plan pending → requisitioned as approval', () => {
    render(
      <FSMActionButtons
        fsm='material_plan'
        currentStatus='pending'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/请购.*审批/)).toBeInTheDocument();
  });

  it('marks forecast validated → adopted as approval', () => {
    render(
      <FSMActionButtons
        fsm='forecast'
        currentStatus='validated'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/采纳.*审批/)).toBeInTheDocument();
  });

  it('calls onAction with targetStatus and requiresApproval flag', () => {
    const onAction = vi.fn();
    render(
      <FSMActionButtons
        fsm='production_plan'
        currentStatus='pending_approval'
        onAction={onAction}
      />
    );
    screen.getByText(/审批通过.*审批/).click();
    expect(onAction).toHaveBeenCalledWith('approved', true);
  });

  it('calls onAction with requiresApproval=false for non-approval transition', () => {
    const onAction = vi.fn();
    render(
      <FSMActionButtons
        fsm='production_plan'
        currentStatus='draft'
        onAction={onAction}
      />
    );
    screen.getByText('提交审批').click();
    expect(onAction).toHaveBeenCalledWith('pending_approval', false);
  });

  it('disables all buttons when disabled prop is true', () => {
    render(
      <FSMActionButtons
        fsm='schedule'
        currentStatus='pending'
        onAction={() => {}}
        disabled
      />
    );
    screen.getAllByRole('button').forEach((btn) => expect(btn).toBeDisabled());
  });
});
