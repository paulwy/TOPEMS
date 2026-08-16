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
    expect(screen.getByText('草稿')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='inbound'
        status='confirmed'
      />
    );
    expect(screen.getByText('已完成')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='inbound'
        status='received'
      />
    );
    expect(screen.getByText('已分配')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='inbound'
        status='completed'
      />
    );
    expect(screen.getByText('已采购')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='inbound'
        status='cancelled'
      />
    );
    expect(screen.getByText('短缺')).toBeInTheDocument();
  });

  it('renders outbound FSM statuses', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='outbound'
        status='created'
      />
    );
    expect(screen.getByText('草稿')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='outbound'
        status='confirmed'
      />
    );
    expect(screen.getByText('已完成')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='outbound'
        status='picking'
      />
    );
    expect(screen.getByText('待处理')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='outbound'
        status='packing'
      />
    );
    expect(screen.getByText('已发布')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='outbound'
        status='shipping'
      />
    );
    expect(screen.getByText('运行中')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='outbound'
        status='completed'
      />
    );
    expect(screen.getByText('已采购')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='outbound'
        status='cancelled'
      />
    );
    expect(screen.getByText('短缺')).toBeInTheDocument();
  });

  it('renders stocktake FSM statuses', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='stocktake'
        status='planned'
      />
    );
    expect(screen.getByText('已审批')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='stocktake'
        status='in_progress'
      />
    );
    expect(screen.getByText('已消耗')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='stocktake'
        status='completed'
      />
    );
    expect(screen.getByText('已采购')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='stocktake'
        status='cancelled'
      />
    );
    expect(screen.getByText('短缺')).toBeInTheDocument();
  });

  it('renders transfer FSM statuses', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='transfer'
        status='pending'
      />
    );
    expect(screen.getByText('进行中')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='transfer'
        status='confirmed'
      />
    );
    expect(screen.getByText('已完成')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='transfer'
        status='shipped'
      />
    );
    expect(screen.getByText('可用')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='transfer'
        status='received'
      />
    );
    expect(screen.getByText('已分配')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='transfer'
        status='completed'
      />
    );
    expect(screen.getByText('已采购')).toBeInTheDocument();
  });

  it('renders wavepick FSM statuses', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='wavepick'
        status='created'
      />
    );
    expect(screen.getByText('草稿')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='wavepick'
        status='assigned'
      />
    );
    expect(screen.getByText('已取消')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='wavepick'
        status='picking'
      />
    );
    expect(screen.getByText('待处理')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='wavepick'
        status='completed'
      />
    );
    expect(screen.getByText('已采购')).toBeInTheDocument();
  });

  it('renders movement FSM statuses', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='movement'
        status='draft'
      />
    );
    expect(screen.getByText('待审批')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='movement'
        status='posted'
      />
    );
    expect(screen.getByText('维护中')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='movement'
        status='completed'
      />
    );
    expect(screen.getByText('已采购')).toBeInTheDocument();
  });

  it('renders serial FSM statuses', () => {
    const { rerender } = render(
      <WmsStatusBadge
        fsm='serial'
        status='pending'
      />
    );
    expect(screen.getByText('进行中')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='serial'
        status='assigned'
      />
    );
    expect(screen.getByText('已取消')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='serial'
        status='used'
      />
    );
    expect(screen.getByText('已请购')).toBeInTheDocument();
    rerender(
      <WmsStatusBadge
        fsm='serial'
        status='archived'
      />
    );
    expect(screen.getByText('已满足')).toBeInTheDocument();
  });

  it('applies correct FSM-specific color classes', () => {
    const cases: Array<{ fsm: WmsFsm; status: string; cls: string; label: string }> = [
      { fsm: 'inbound', status: 'received', cls: 'bg-orange-100 text-orange-700', label: '已分配' },
      { fsm: 'outbound', status: 'packing', cls: 'bg-orange-100 text-orange-700', label: '已发布' },
      { fsm: 'stocktake', status: 'in_progress', cls: 'bg-orange-100 text-orange-700', label: '已消耗' },
      { fsm: 'transfer', status: 'confirmed', cls: 'bg-orange-100 text-orange-700', label: '已完成' },
      { fsm: 'movement', status: 'posted', cls: 'bg-orange-100 text-orange-700', label: '维护中' },
      { fsm: 'inbound', status: 'completed', cls: 'bg-green-100 text-green-700', label: '已采购' },
      { fsm: 'inbound', status: 'cancelled', cls: 'bg-red-100 text-red-700', label: '短缺' },
    ];
    cases.forEach(({ fsm, status, cls, label }) => {
      const { unmount } = render(
        <WmsStatusBadge
          fsm={fsm}
          status={status}
        />
      );
      const badge = screen.getByText(label);
      expect(badge.className).toContain(cls);
      unmount();
    });
  });

  it('renders unknown status with default yellow color and raw text', () => {
    render(
      <WmsStatusBadge
        fsm='inbound'
        status='unknown_status'
      />
    );
    const badge = screen.getByText('unknown status');
    expect(badge.className).toContain('bg-yellow-50 text-yellow-700');
  });

  it('falls back to default color for status not in given FSM', () => {
    render(
      <WmsStatusBadge
        fsm='serial'
        status='confirmed'
      />
    );
    const badge = screen.getByText('已完成');
    expect(badge.className).toContain('bg-yellow-50');
  });

  it('uses custom label when provided instead of STATUS_LABELS lookup', () => {
    render(
      <WmsStatusBadge
        fsm='inbound'
        status='created'
        label='自定义创建'
      />
    );
    expect(screen.getByText('自定义创建')).toBeInTheDocument();
  });
});

describe('WMS FSMActionButtons', () => {
  it('shows correct transition buttons for inbound created status', () => {
    render(
      <WmsFSMActionButtons
        fsm='inbound'
        currentStatus='created'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('提交审批')).toBeInTheDocument();
    expect(screen.getByText('开始执行')).toBeInTheDocument();
  });

  it('marks inbound received → completed as approval', () => {
    render(
      <WmsFSMActionButtons
        fsm='inbound'
        currentStatus='received'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('驳回')).toBeInTheDocument();
    expect(screen.getByText(/取消.*审批/)).toBeInTheDocument();
  });

  it('shows no buttons for terminal status (inbound completed)', () => {
    const { container } = render(
      <WmsFSMActionButtons
        fsm='inbound'
        currentStatus='completed'
        onAction={() => {}}
      />
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('shows no buttons for terminal status (serial archived)', () => {
    const { container } = render(
      <WmsFSMActionButtons
        fsm='serial'
        currentStatus='archived'
        onAction={() => {}}
      />
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('shows no buttons for terminal status (cancelled)', () => {
    const { container } = render(
      <WmsFSMActionButtons
        fsm='outbound'
        currentStatus='cancelled'
        onAction={() => {}}
      />
    );
    expect(container.querySelectorAll('button').length).toBe(0);
  });

  it('marks outbound packing → shipping as approval', () => {
    render(
      <WmsFSMActionButtons
        fsm='outbound'
        currentStatus='packing'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('取消')).toBeInTheDocument();
    expect(screen.getByText(/开始运行.*审批/)).toBeInTheDocument();
  });

  it('renders stocktake full transition chain', () => {
    const { rerender } = render(
      <WmsFSMActionButtons
        fsm='stocktake'
        currentStatus='planned'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('维护')).toBeInTheDocument();
    expect(screen.getByText('释放')).toBeInTheDocument();
    rerender(
      <WmsFSMActionButtons
        fsm='stocktake'
        currentStatus='in_progress'
        onAction={() => {}}
      />
    );
    expect(screen.getByText(/消耗.*审批/)).toBeInTheDocument();
    expect(screen.getByText('恢复可用')).toBeInTheDocument();
  });

  it('marks transfer confirmed → shipped as approval', () => {
    render(
      <WmsFSMActionButtons
        fsm='transfer'
        currentStatus='confirmed'
        onAction={() => {}}
      />
    );
    expect(screen.getByText('请购')).toBeInTheDocument();
    expect(screen.getByText(/标记短缺.*审批/)).toBeInTheDocument();
  });

  it('calls onAction with (action, from, to) signature for non-approval transition', () => {
    const onAction = vi.fn();
    render(
      <WmsFSMActionButtons
        fsm='inbound'
        currentStatus='created'
        onAction={onAction}
      />
    );
    screen.getByText('提交审批').click();
    expect(onAction).toHaveBeenCalledWith('confirm', 'created', 'confirmed');
  });

  it('calls onAction with correct args for approval transition', () => {
    const onAction = vi.fn();
    render(
      <WmsFSMActionButtons
        fsm='movement'
        currentStatus='posted'
        onAction={onAction}
      />
    );
    screen.getByText(/替代.*审批/).click();
    expect(onAction).toHaveBeenCalledWith('complete', 'posted', 'completed');
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
});
