import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WmsStatusBadge, type WmsFsm } from '../StatusBadge';
import { WmsFSMActionButtons } from '../FSMActionButtons';

describe('WMS StatusBadge', () => {
  it('renders inbound FSM statuses correctly', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='inbound'
        status='created'
      />
    );
    expect(screen.getByText('已创建')).toBeInTheDocument();

    rerender(
      <WmsStatusBadge
        fsm='inbound'
        status='confirmed'
      />
    );
    expect(screen.getByText('已确认')).toBeInTheDocument();
    let badge = screen.getByText('已确认');
    expect(badge.className).toContain('bg-blue-100');

    rerender(
      <WmsStatusBadge
        fsm='inbound'
        status='received'
      />
    );
    expect(screen.getByText('已收货')).toBeInTheDocument();
    badge = screen.getByText('已收货');
    expect(badge.className).toContain('bg-orange-100');

    rerender(
      <WmsStatusBadge
        fsm='inbound'
        status='completed'
      />
    );
    expect(screen.getByText('已完成')).toBeInTheDocument();
    badge = screen.getByText('已完成');
    expect(badge.className).toContain('bg-green-100');

    rerender(
      <WmsStatusBadge
        fsm='inbound'
        status='cancelled'
      />
    );
    expect(screen.getByText('已取消')).toBeInTheDocument();
    badge = screen.getByText('已取消');
    expect(badge.className).toContain('bg-red-100');
  });

  it('renders outbound FSM statuses including packing approval orange', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='outbound'
        status='created'
      />
    );
    expect(screen.getByText('已创建')).toBeInTheDocument();
    let badge = screen.getByText('已创建');
    expect(badge.className).toContain('bg-gray-100');

    rerender(
      <WmsStatusBadge
        fsm='outbound'
        status='picking'
      />
    );
    expect(screen.getByText('拣货中')).toBeInTheDocument();
    expect(screen.getByText('拣货中').className).toContain('bg-blue-100');

    rerender(
      <WmsStatusBadge
        fsm='outbound'
        status='packing'
      />
    );
    expect(screen.getByText('包装中')).toBeInTheDocument();
    badge = screen.getByText('包装中');
    expect(badge.className).toContain('bg-orange-100');

    rerender(
      <WmsStatusBadge
        fsm='outbound'
        status='shipping'
      />
    );
    expect(screen.getByText('运输中')).toBeInTheDocument();

    rerender(
      <WmsStatusBadge
        fsm='outbound'
        status='completed'
      />
    );
    expect(screen.getByText('已完成').className).toContain('bg-green-100');
  });

  it('renders stocktake FSM with in_progress as orange approval', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='stocktake'
        status='planned'
      />
    );
    expect(screen.getByText('已计划')).toBeInTheDocument();
    expect(screen.getByText('已计划').className).toContain('bg-gray-100');

    rerender(
      <WmsStatusBadge
        fsm='stocktake'
        status='in_progress'
      />
    );
    expect(screen.getByText('进行中')).toBeInTheDocument();
    expect(screen.getByText('进行中').className).toContain('bg-orange-100');

    rerender(
      <WmsStatusBadge
        fsm='stocktake'
        status='completed'
      />
    );
    expect(screen.getByText('已完成').className).toContain('bg-green-100');

    rerender(
      <WmsStatusBadge
        fsm='stocktake'
        status='cancelled'
      />
    );
    expect(screen.getByText('已取消').className).toContain('bg-red-100');
  });

  it('renders transfer FSM with confirmed as orange approval', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='transfer'
        status='pending'
      />
    );
    expect(screen.getByText('待处理')).toBeInTheDocument();
    expect(screen.getByText('待处理').className).toContain('bg-gray-100');

    rerender(
      <WmsStatusBadge
        fsm='transfer'
        status='confirmed'
      />
    );
    expect(screen.getByText('已确认').className).toContain('bg-orange-100');

    rerender(
      <WmsStatusBadge
        fsm='transfer'
        status='shipped'
      />
    );
    expect(screen.getByText('已发运').className).toContain('bg-blue-100');

    rerender(
      <WmsStatusBadge
        fsm='transfer'
        status='received'
      />
    );
    expect(screen.getByText('已收货').className).toContain('bg-blue-100');

    rerender(
      <WmsStatusBadge
        fsm='transfer'
        status='completed'
      />
    );
    expect(screen.getByText('已完成').className).toContain('bg-green-100');
  });

  it('renders wavepick FSM statuses correctly', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='wavepick'
        status='created'
      />
    );
    expect(screen.getByText('已创建')).toBeInTheDocument();
    expect(screen.getByText('已创建').className).toContain('bg-gray-100');

    rerender(
      <WmsStatusBadge
        fsm='wavepick'
        status='assigned'
      />
    );
    expect(screen.getByText('已分配').className).toContain('bg-blue-100');

    rerender(
      <WmsStatusBadge
        fsm='wavepick'
        status='picking'
      />
    );
    expect(screen.getByText('拣货中').className).toContain('bg-blue-100');

    rerender(
      <WmsStatusBadge
        fsm='wavepick'
        status='completed'
      />
    );
    expect(screen.getByText('已完成').className).toContain('bg-green-100');
  });

  it('renders movement FSM with posted as orange approval', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='movement'
        status='draft'
      />
    );
    expect(screen.getByText('草稿')).toBeInTheDocument();
    expect(screen.getByText('草稿').className).toContain('bg-gray-100');

    rerender(
      <WmsStatusBadge
        fsm='movement'
        status='posted'
      />
    );
    expect(screen.getByText('已过账').className).toContain('bg-orange-100');

    rerender(
      <WmsStatusBadge
        fsm='movement'
        status='completed'
      />
    );
    expect(screen.getByText('已完成').className).toContain('bg-green-100');

    rerender(
      <WmsStatusBadge
        fsm='movement'
        status='cancelled'
      />
    );
    expect(screen.getByText('已取消').className).toContain('bg-red-100');
  });

  it('renders serial FSM statuses including archived green terminal', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='serial'
        status='pending'
      />
    );
    expect(screen.getByText('待处理')).toBeInTheDocument();

    rerender(
      <WmsStatusBadge
        fsm='serial'
        status='assigned'
      />
    );
    expect(screen.getByText('已分配').className).toContain('bg-blue-100');

    rerender(
      <WmsStatusBadge
        fsm='serial'
        status='used'
      />
    );
    expect(screen.getByText('已使用').className).toContain('bg-blue-100');

    rerender(
      <WmsStatusBadge
        fsm='serial'
        status='archived'
      />
    );
    expect(screen.getByText('已归档').className).toContain('bg-green-100');
  });

  it('renders unknown status with yellow fallback color', () => {
    render(
      <WmsStatusBadge
        fsm='inbound'
        status='unknown_status'
      />
    );
    const badge = screen.getByText('unknown status');
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain('bg-yellow-50');
    expect(badge.className).toContain('text-yellow-700');
  });

  it('switches FSM type for same status to show different color class', () => {
    const { unmount } = render(
      <WmsStatusBadge
        fsm='inbound'
        status='received'
      />
    );
    expect(screen.getByText('已收货').className).toContain('bg-orange-100');
    unmount();
    render(
      <WmsStatusBadge
        fsm='transfer'
        status='received'
      />
    );
    expect(screen.getByText('已收货').className).toContain('bg-blue-100');
  });

  it('handles empty status gracefully with default gray', () => {
    const { container } = render(
      <WmsStatusBadge
        fsm='inbound'
        status=''
      />
    );
    const badge = container.querySelector('span.inline-flex');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain('bg-gray-100');
  });

  it('renders all terminal statuses (completed/archived/cancelled) correctly', () => {
    const { rerender, unmount } = render(
      <WmsStatusBadge
        fsm='inbound'
        status='completed'
      />
    );
    expect(screen.getByText('已完成').className).toContain('bg-green-100');
    unmount();
    render(
      <WmsStatusBadge
        fsm='serial'
        status='archived'
      />
    );
    expect(screen.getByText('已归档').className).toContain('bg-green-100');
    unmount();
    render(
      <WmsStatusBadge
        fsm='outbound'
        status='cancelled'
      />
    );
    expect(screen.getByText('已取消').className).toContain('bg-red-100');
  });

  it('uses custom label when provided', () => {
    render(
      <WmsStatusBadge
        fsm='inbound'
        status='created'
        label='自定义创建标签'
      />
    );
    expect(screen.getByText('自定义创建标签')).toBeInTheDocument();
  });
});

describe('WMS FSMActionButtons', () => {
  it('renders inbound created transitions (confirm + cancel)', () => {
    render(
      <WmsFSMActionButtons
        fsm='inbound'
        currentStatus='created'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('确认')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
  });

  it('marks inbound received→completed as approval gate', () => {
    render(
      <WmsFSMActionButtons
        fsm='inbound'
        currentStatus='received'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/完成.*审批/)).toBeInTheDocument();
    expect(screen.getByText('拒收回流')).toBeInTheDocument();
  });

  it('renders no buttons for inbound terminal (completed)', () => {
    const { container } = render(
      <WmsFSMActionButtons
        fsm='inbound'
        currentStatus='completed'
        onAction={() => {}}
      />
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('marks outbound packing→shipping as approval gate', () => {
    render(
      <WmsFSMActionButtons
        fsm='outbound'
        currentStatus='packing'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/发运.*审批/)).toBeInTheDocument();
    expect(screen.getByText('回流拣货')).toBeInTheDocument();
  });

  it('marks stocktake in_progress→completed as approval', () => {
    render(
      <WmsFSMActionButtons
        fsm='stocktake'
        currentStatus='in_progress'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/完成盘点.*审批/)).toBeInTheDocument();
  });

  it('marks transfer confirmed→shipped as approval', () => {
    render(
      <WmsFSMActionButtons
        fsm='transfer'
        currentStatus='confirmed'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/发运.*审批/)).toBeInTheDocument();
    expect(screen.getByText('退回待处理')).toBeInTheDocument();
  });

  it('renders wavepick no-approval transitions', () => {
    const { rerender } = render(
      <WmsFSMActionButtons
        fsm='wavepick'
        currentStatus='created'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('分配拣货员')).toBeInTheDocument();
    expect(screen.queryByText(/审批/)).toBeNull();
    rerender(
      <WmsFSMActionButtons
        fsm='wavepick'
        currentStatus='assigned'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('开始拣货')).toBeInTheDocument();
  });

  it('marks movement posted→completed as approval', () => {
    render(
      <WmsFSMActionButtons
        fsm='movement'
        currentStatus='posted'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/完成.*审批/)).toBeInTheDocument();
  });

  it('calls onAction with action/from/to tuple for non-approval transition', () => {
    const onAction = vi.fn();
    render(
      <WmsFSMActionButtons
        fsm='inbound'
        currentStatus='created'
        onAction={onAction}
      />
    );
    screen.getByText('确认').click();
    expect(onAction).toHaveBeenCalledWith('confirm', 'created', 'confirmed');
  });

  it('disables all buttons when disabled prop is true', () => {
    render(
      <WmsFSMActionButtons
        fsm='inbound'
        currentStatus='created'
        onAction={() => {}}
        disabled
      />
    );
    screen.getAllByRole('button').forEach((btn) => expect(btn).toBeDisabled());
  });

  it('renders serial pending→assigned→used→archived chain (no approval)', () => {
    const { rerender } = render(
      <WmsFSMActionButtons
        fsm='serial'
        currentStatus='pending'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('分配')).toBeInTheDocument();
    expect(screen.queryByText(/审批/)).toBeNull();
    rerender(
      <WmsFSMActionButtons
        fsm='serial'
        currentStatus='assigned'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('使用')).toBeInTheDocument();
    rerender(
      <WmsFSMActionButtons
        fsm='serial'
        currentStatus='used'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('归档')).toBeInTheDocument();
    rerender(
      <WmsFSMActionButtons
        fsm='serial'
        currentStatus='archived'
        onAction={() => {}}
      />
    );
    expect(screen.queryAllByRole('button').length).toBe(0);
  });
});
