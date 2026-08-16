import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const { tMock } = vi.hoisted(() => {
  const statusBadgeTranslations: Record<string, string> = {
    'components.status_badge.k0': '草稿',
    'components.status_badge.k1': '待审批',
    'components.status_badge.k2': '已审批',
    'components.status_badge.k3': '进行中',
    'components.status_badge.k4': '已完成',
    'components.status_badge.k5': '已取消',
    'components.status_badge.k6': '待处理',
    'components.status_badge.k7': '已发布',
    'components.status_badge.k8': '运行中',
    'components.status_badge.k9': '可用',
    'components.status_badge.k10': '已分配',
    'components.status_badge.k11': '已消耗',
    'components.status_badge.k12': '维护中',
    'components.status_badge.k13': '已请购',
    'components.status_badge.k14': '已采购',
    'components.status_badge.k15': '已满足',
    'components.status_badge.k16': '短缺',
    'components.status_badge.k17': '已计算',
    'components.status_badge.k18': '已验证',
    'components.status_badge.k19': '已采纳',
    'components.status_badge.k20': '已替代',
  };

  const fsmActionButtonsTranslations: Record<string, string> = {
    'components.fsm_action_buttons.k0': '提交审批',
    'components.fsm_action_buttons.k1': '取消',
    'components.fsm_action_buttons.k2': '审批通过',
    'components.fsm_action_buttons.k3': '驳回',
    'components.fsm_action_buttons.k4': '取消',
    'components.fsm_action_buttons.k5': '开始执行',
    'components.fsm_action_buttons.k6': '取消',
    'components.fsm_action_buttons.k7': '完成',
    'components.fsm_action_buttons.k8': '取消',
    'components.fsm_action_buttons.k9': '发布',
    'components.fsm_action_buttons.k10': '取消',
    'components.fsm_action_buttons.k11': '开始运行',
    'components.fsm_action_buttons.k12': '暂停',
    'components.fsm_action_buttons.k13': '取消',
    'components.fsm_action_buttons.k14': '完成',
    'components.fsm_action_buttons.k15': '取消',
    'components.fsm_action_buttons.k16': '分配',
    'components.fsm_action_buttons.k17': '维护',
    'components.fsm_action_buttons.k18': '消耗',
    'components.fsm_action_buttons.k19': '释放',
    'components.fsm_action_buttons.k20': '恢复可用',
    'components.fsm_action_buttons.k21': '重新可用',
    'components.fsm_action_buttons.k22': '请购',
    'components.fsm_action_buttons.k23': '标记短缺',
    'components.fsm_action_buttons.k24': '取消',
    'components.fsm_action_buttons.k25': '已采购',
    'components.fsm_action_buttons.k26': '取消',
    'components.fsm_action_buttons.k27': '满足',
    'components.fsm_action_buttons.k28': '取消',
    'components.fsm_action_buttons.k29': '重新请购',
    'components.fsm_action_buttons.k30': '计算',
    'components.fsm_action_buttons.k31': '取消',
    'components.fsm_action_buttons.k32': '验证',
    'components.fsm_action_buttons.k33': '重新计算',
    'components.fsm_action_buttons.k34': '取消',
    'components.fsm_action_buttons.k35': '采纳',
    'components.fsm_action_buttons.k36': '取消',
    'components.fsm_action_buttons.k37': '替代',
    'components.fsm_action_buttons.k38': ' (审批)',
    'components.fsm_action_buttons.k39': '取消',
    'components.fsm_action_buttons.k40': '分配',
    'components.fsm_action_buttons.k41': '使用',
    'components.fsm_action_buttons.k42': '归档',
    'components.fsm_action_buttons.k43': ' (审批)',
    'components.fsm_action_buttons.k44': '取消',
    'components.fsm_action_buttons.k45': '计算',
    'components.fsm_action_buttons.k46': '取消',
    'components.fsm_action_buttons.k47': '验证',
    'components.fsm_action_buttons.k48': '取消',
    'components.fsm_action_buttons.k49': ' (审批)',
  };

  const tMock = (key: string): string => {
    return (
      statusBadgeTranslations[key] ||
      fsmActionButtonsTranslations[key] ||
      key
    );
  };

  return { tMock };
});

vi.mock('@/i18n', () => ({
  default: {
    t: tMock,
    language: 'zh',
    on: () => {},
    use: () => ({ init: () => {} }),
    init: () => {},
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: tMock,
    i18n: {
      language: 'zh',
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
  Trans: ({ children, i18nKey }: { children?: React.ReactNode; i18nKey?: string }) => {
    if (i18nKey) {
      return <span>{tMock(i18nKey)}</span>;
    }
    return <span>{children}</span>;
  },
}));

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
    expect(screen.getByText('草稿')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='inspection'
        status='in_progress'
      />
    );
    expect(screen.getByText('待审批')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='inspection'
        status='pending_audit'
      />
    );
    expect(screen.getByText('已审批')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='inspection'
        status='completed'
      />
    );
    expect(screen.getByText('进行中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='inspection'
        status='rejected'
      />
    );
    expect(screen.getByText('已完成')).toBeInTheDocument();
  });

  it('renders issue FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='issue'
        status='open'
      />
    );
    expect(screen.getByText('已取消')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='issue'
        status='resolved'
      />
    );
    expect(screen.getByText('待处理')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='issue'
        status='closed'
      />
    );
    expect(screen.getByText('已发布')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='issue'
        status='cancelled'
      />
    );
    expect(screen.getByText('运行中')).toBeInTheDocument();
  });

  it('renders action FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='action'
        status='pending'
      />
    );
    expect(screen.getByText('草稿')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='action'
        status='completed'
      />
    );
    expect(screen.getByText('进行中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='action'
        status='verified'
      />
    );
    expect(screen.getByText('已消耗')).toBeInTheDocument();
  });

  it('renders audit_plan FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='audit_plan'
        status='draft'
      />
    );
    expect(screen.getByText('可用')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='audit_plan'
        status='scheduled'
      />
    );
    expect(screen.getByText('已分配')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='audit_plan'
        status='in_progress'
      />
    );
    expect(screen.getByText('待审批')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='audit_plan'
        status='cancelled'
      />
    );
    expect(screen.getByText('运行中')).toBeInTheDocument();
  });

  it('renders audit_finding FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='audit_finding'
        status='open'
      />
    );
    expect(screen.getByText('已取消')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='audit_finding'
        status='verified'
      />
    );
    expect(screen.getByText('已消耗')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='audit_finding'
        status='closed'
      />
    );
    expect(screen.getByText('已发布')).toBeInTheDocument();
  });

  it('renders eight_d FSM statuses including root_cause', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='eight_d'
        status='initiated'
      />
    );
    expect(screen.getByText('维护中')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='eight_d'
        status='containment'
      />
    );
    expect(screen.getByText('已请购')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='eight_d'
        status='root_cause'
      />
    );
    expect(screen.getByText('已采购')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='eight_d'
        status='permanent_action'
      />
    );
    expect(screen.getByText('已满足')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='eight_d'
        status='verified'
      />
    );
    expect(screen.getByText('已消耗')).toBeInTheDocument();
  });

  it('renders apqp FSM statuses', () => {
    const { rerender } = render(
      <StatusBadge
        fsm='apqp'
        status='planning'
      />
    );
    expect(screen.getByText('短缺')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='apqp'
        status='in_design'
      />
    );
    expect(screen.getByText('已计算')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='apqp'
        status='in_pilot'
      />
    );
    expect(screen.getByText('已验证')).toBeInTheDocument();
    rerender(
      <StatusBadge
        fsm='apqp'
        status='in_production'
      />
    );
    expect(screen.getByText('已采纳')).toBeInTheDocument();
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
    render(
      <StatusBadge
        fsm='inspection'
        status='closed'
      />
    );
    const badge = screen.getByText('已发布');
    expect(badge.className).toContain('bg-gray-100');
  });

  it('switches color classes across FSMs for same status value', () => {
    const { unmount } = render(
      <StatusBadge
        fsm='inspection'
        status='completed'
      />
    );
    let badge = screen.getByText('进行中');
    expect(badge.className).toContain('bg-green-100');
    unmount();
    render(
      <StatusBadge
        fsm='action'
        status='completed'
      />
    );
    badge = screen.getByText('进行中');
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
    expect(screen.getByText('提交审批')).toBeInTheDocument();
  });

  it('marks inspection pending_audit transitions as approval', () => {
    render(
      <FSMActionButtons
        fsm='inspection'
        currentStatus='pending_audit'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/审批通过.*审批/)).toBeInTheDocument();
    expect(screen.getByText(/驳回.*审批/)).toBeInTheDocument();
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
    expect(screen.getByText('计算')).toBeInTheDocument();
    rerender(
      <FSMActionButtons
        fsm='eight_d'
        currentStatus='root_cause'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('取消')).toBeInTheDocument();
  });

  it('marks apqp in_pilot → in_production as approval', () => {
    render(
      <FSMActionButtons
        fsm='apqp'
        currentStatus='in_pilot'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/计算.*审批/)).toBeInTheDocument();
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
    screen.getByText(/取消.*审批/).click();
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
    screen.getByText('开始执行').click();
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
