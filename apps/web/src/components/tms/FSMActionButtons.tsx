/**
 * TMS FSM 操作按钮组件
 *
 * 按 5 套 FSM 的可达性表动态渲染操作按钮：
 * - 审批转换（requiresApproval=true）显示 "审批" 风格按钮
 * - 非审批转换显示直接动作按钮
 * - 终态不渲染任何按钮
 *
 * 转换映射与 svc/tms/src/shared/fsm.rs 1:1 对齐。
 */

import type { TmsFsmType } from './StatusBadge';
import i18n from '@/i18n';

interface FSMTransition {
  /** 目标状态 */
  targetStatus: string;
  /** 按钮标签 */
  label: string;
  /** 是否需要审批 */
  requiresApproval?: boolean;
}

// 5 套 FSM 的转换映射表（from → transitions[]）
const FSM_TRANSITIONS: Record<TmsFsmType, Record<string, FSMTransition[]>> = {
  vehicle: {
    active: [
      { targetStatus: 'maintenance', label: i18n.t('components.fsm_action_buttons.k0') },
      { targetStatus: 'retired', label: i18n.t('components.fsm_action_buttons.k1') },
    ],
    maintenance: [
      { targetStatus: 'active', label: i18n.t('components.fsm_action_buttons.k2') },
      { targetStatus: 'inactive', label: i18n.t('components.fsm_action_buttons.k3') },
    ],
    inactive: [
      { targetStatus: 'active', label: i18n.t('components.fsm_action_buttons.k4') },
      {
        targetStatus: 'retired',
        label: i18n.t('components.fsm_action_buttons.k5'),
        requiresApproval: true,
      },
    ],
  },
  driver: {
    active: [
      { targetStatus: 'on_leave', label: i18n.t('components.fsm_action_buttons.k6') },
      { targetStatus: 'suspended', label: i18n.t('components.fsm_action_buttons.k7') },
    ],
    on_leave: [
      { targetStatus: 'active', label: i18n.t('components.fsm_action_buttons.k8') },
      { targetStatus: 'inactive', label: i18n.t('components.fsm_action_buttons.k9') },
    ],
    suspended: [
      { targetStatus: 'active', label: i18n.t('components.fsm_action_buttons.k10') },
      {
        targetStatus: 'inactive',
        label: i18n.t('components.fsm_action_buttons.k11'),
        requiresApproval: true,
      },
    ],
  },
  carrier: {
    pending_review: [
      {
        targetStatus: 'active',
        label: i18n.t('components.fsm_action_buttons.k12'),
        requiresApproval: true,
      },
      { targetStatus: 'rejected', label: i18n.t('components.fsm_action_buttons.k13') },
    ],
    active: [{ targetStatus: 'suspended', label: i18n.t('components.fsm_action_buttons.k14') }],
    suspended: [
      { targetStatus: 'active', label: i18n.t('components.fsm_action_buttons.k15') },
      { targetStatus: 'blacklisted', label: i18n.t('components.fsm_action_buttons.k16') },
    ],
  },
  route: {
    planning: [
      {
        targetStatus: 'active',
        label: i18n.t('components.fsm_action_buttons.k17'),
        requiresApproval: true,
      },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k18') },
    ],
    active: [{ targetStatus: 'closed', label: i18n.t('components.fsm_action_buttons.k19') }],
    closed: [
      { targetStatus: 'active', label: i18n.t('components.fsm_action_buttons.k20') },
      { targetStatus: 'deprecated', label: i18n.t('components.fsm_action_buttons.k21') },
    ],
  },
  shipment: {
    draft: [
      { targetStatus: 'pending', label: i18n.t('components.fsm_action_buttons.k22') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k23') },
    ],
    pending: [
      {
        targetStatus: 'in_transit',
        label: i18n.t('components.fsm_action_buttons.k24'),
        requiresApproval: true,
      },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k25') },
    ],
    in_transit: [
      { targetStatus: 'delivered', label: i18n.t('components.fsm_action_buttons.k26') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k27') },
    ],
  },
};

interface FSMActionButtonsProps {
  /** FSM 类型 */
  fsm: TmsFsmType;
  /** 当前状态 */
  currentStatus: string;
  /** 操作回调，接收 (targetStatus, requiresApproval) */
  onAction: (targetStatus: string, requiresApproval: boolean) => void;
  /** 是否禁用所有按钮 */
  disabled?: boolean;
}

export function FSMActionButtons({
  fsm,
  currentStatus,
  onAction,
  disabled,
}: FSMActionButtonsProps) {
  const transitions = FSM_TRANSITIONS[fsm]?.[currentStatus] ?? [];
  if (transitions.length === 0) {
    return null;
  }
  return (
    <div className='flex flex-wrap gap-2'>
      {transitions.map((t) => {
        const requiresApproval = t.requiresApproval === true;
        return (
          <button
            key={t.targetStatus}
            type='button'
            disabled={disabled}
            onClick={() => onAction(t.targetStatus, requiresApproval)}
            className={
              requiresApproval
                ? 'inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-3 py-1 text-sm text-amber-700 hover:bg-amber-100 disabled:opacity-50'
                : 'inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50'
            }
          >
            {t.label}
            {requiresApproval && i18n.t('components.fsm_action_buttons.k28')}
          </button>
        );
      })}
    </div>
  );
}

export default FSMActionButtons;
