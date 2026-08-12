import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusBadge } from '../StatusBadge';
import { FSMActionButtons } from '../FSMActionButtons';

describe('TMS StatusBadge', () => {
  it('renders vehicle FSM statuses with correct labels', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='vehicle'
        status='active'
      />
    );
    expect(screen.getByText('运行中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='vehicle'
        status='maintenance'
      />
    );
    expect(screen.getByText('维护中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='vehicle'
        status='inactive'
      />
    );
    expect(screen.getByText('停用')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='vehicle'
        status='retired'
      />
    );
    expect(screen.getByText('已退役')).toBeInTheDocument();
  });

  it('renders driver FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='driver'
        status='active'
      />
    );
    expect(screen.getByText('运行中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='driver'
        status='on_leave'
      />
    );
    expect(screen.getByText('休假中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='driver'
        status='suspended'
      />
    );
    expect(screen.getByText('已暂停')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='driver'
        status='inactive'
      />
    );
    expect(screen.getByText('停用')).toBeInTheDocument();
  });

  it('renders carrier FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='carrier'
        status='pending_review'
      />
    );
    expect(screen.getByText('待审核')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='carrier'
        status='active'
      />
    );
    expect(screen.getByText('运行中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='carrier'
        status='suspended'
      />
    );
    expect(screen.getByText('已暂停')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='carrier'
        status='blacklisted'
      />
    );
    expect(screen.getByText('已拉黑')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='carrier'
        status='rejected'
      />
    );
    expect(screen.getByText('已拒绝')).toBeInTheDocument();
  });

  it('renders route FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='route'
        status='planning'
      />
    );
    expect(screen.getByText('规划中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='route'
        status='active'
      />
    );
    expect(screen.getByText('运行中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='route'
        status='closed'
      />
    );
    expect(screen.getByText('已关闭')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='route'
        status='deprecated'
      />
    );
    expect(screen.getByText('已废弃')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='route'
        status='cancelled'
      />
    );
    expect(screen.getByText('已取消')).toBeInTheDocument();
  });

  it('renders shipment FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='shipment'
        status='draft'
      />
    );
    expect(screen.getByText('草稿')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='shipment'
        status='pending'
      />
    );
    expect(screen.getByText('待发车')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='shipment'
        status='in_transit'
      />
    );
    expect(screen.getByText('运输中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='shipment'
        status='delivered'
      />
    );
    expect(screen.getByText('已送达')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='shipment'
        status='cancelled'
      />
    );
    expect(screen.getByText('已取消')).toBeInTheDocument();
  });

  it('renders unknown status with default gray color and raw text', () => {
    render(
      <StatusBadge
        fsm='vehicle'
        status='unknown_status'
      />
    );
    expect(screen.getByText('unknown status')).toBeInTheDocument();
  });

  it('falls back to default color for status not in given FSM', () => {
    // delivered does not belong to vehicle FSM, should fall back to gray
    render(
      <StatusBadge
        fsm='vehicle'
        status='delivered'
      />
    );
    const badge = screen.getByText('已送达');
    expect(badge.className).toContain('bg-gray-100');
  });

  it('switches color classes across FSMs for same status value', () => {
    // active in vehicle = gray (initial), active in carrier = blue (progress)
    const { unmount } = render(
      <StatusBadge
        fsm='vehicle'
        status='active'
      />
    );
    let badge = screen.getByText('运行中');
    expect(badge.className).toContain('bg-gray-100');
    unmount();
    render(
      <StatusBadge
        fsm='carrier'
        status='active'
      />
    );
    badge = screen.getByText('运行中');
    expect(badge.className).toContain('bg-blue-100');
  });

  it('uses custom label when provided', () => {
    render(
      <StatusBadge
        fsm='vehicle'
        status='active'
        label='自定义标签'
      />
    );
    expect(screen.getByText('自定义标签')).toBeInTheDocument();
  });
});

describe('TMS FSMActionButtons', () => {
  it('shows transitions for vehicle active status', () => {
    render(
      <FSMActionButtons
        fsm='vehicle'
        currentStatus='active'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('提交检修')).toBeInTheDocument();
    expect(screen.getByText('直接退役')).toBeInTheDocument();
  });

  it('marks vehicle inactive → retired as approval', () => {
    render(
      <FSMActionButtons
        fsm='vehicle'
        currentStatus='inactive'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/退役.*审批/)).toBeInTheDocument();
  });

  it('shows no buttons for terminal status (vehicle retired)', () => {
    const { container } = render(
      <FSMActionButtons
        fsm='vehicle'
        currentStatus='retired'
        onAction={() => {}}
      />
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('shows no buttons for terminal status (shipment delivered)', () => {
    const { container } = render(
      <FSMActionButtons
        fsm='shipment'
        currentStatus='delivered'
        onAction={() => {}}
      />
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('shows no buttons for terminal status (shipment cancelled)', () => {
    const { container } = render(
      <FSMActionButtons
        fsm='shipment'
        currentStatus='cancelled'
        onAction={() => {}}
      />
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('renders carrier full transition chain', () => {
    const { rerender } = render(
      <FSMActionButtons
        fsm='carrier'
        currentStatus='pending_review'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/审核通过.*审批/)).toBeInTheDocument();
    rerender(
      <FSMActionButtons
        fsm='carrier'
        currentStatus='suspended'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('拉黑')).toBeInTheDocument();
  });

  it('marks shipment pending → in_transit as approval', () => {
    render(
      <FSMActionButtons
        fsm='shipment'
        currentStatus='pending'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/审批发车.*审批/)).toBeInTheDocument();
  });

  it('marks route planning → active as approval', () => {
    render(
      <FSMActionButtons
        fsm='route'
        currentStatus='planning'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/启用.*审批/)).toBeInTheDocument();
  });

  it('marks driver suspended → inactive as approval', () => {
    render(
      <FSMActionButtons
        fsm='driver'
        currentStatus='suspended'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/停用.*审批/)).toBeInTheDocument();
  });

  it('calls onAction with targetStatus and requiresApproval flag', () => {
    const onAction = vi.fn();
    render(
      <FSMActionButtons
        fsm='shipment'
        currentStatus='pending'
        onAction={onAction}
      />
    );
    screen.getByText(/审批发车.*审批/).click();
    expect(onAction).toHaveBeenCalledWith('in_transit', true);
  });

  it('calls onAction with requiresApproval=false for non-approval transition', () => {
    const onAction = vi.fn();
    render(
      <FSMActionButtons
        fsm='shipment'
        currentStatus='draft'
        onAction={onAction}
      />
    );
    screen.getByText('提交审批').click();
    expect(onAction).toHaveBeenCalledWith('pending', false);
  });

  it('disables all buttons when disabled prop is true', () => {
    render(
      <FSMActionButtons
        fsm='vehicle'
        currentStatus='active'
        onAction={() => {}}
        disabled
      />
    );
    screen.getAllByRole('button').forEach((btn) => expect(btn).toBeDisabled());
  });
});
