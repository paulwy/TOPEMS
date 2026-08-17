/**
 * APS FSM 操作按钮组件
 *
 * 按 5 套 FSM 的可达性表动态渲染操作按钮：
 * - 审批转换（requiresApproval=true）显示 "审批" 风格按钮
 * - 非审批转换显示直接动作按钮
 * - 终态不渲染任何按钮
 *
 * 转换映射与 svc/aps/src/shared/fsm.rs 1:1 对齐。
 */

import type { ApsFsmType } from './StatusBadge';
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
const FSM_TRANSITIONS: Record<ApsFsmType, Record<string, FSMTransition[]>> = {
  production_plan: {
    draft: [
      { targetStatus: 'pending_approval', label: i18n.t('components.fsm_action_buttons.k0') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k1') },
    ],
    pending_approval: [
      {
        targetStatus: 'approved',
        label: i18n.t('components.fsm_action_buttons.k2'),
        requiresApproval: true,
      },
      { targetStatus: 'draft', label: i18n.t('components.fsm_action_buttons.k3') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k4') },
    ],
    approved: [
      { targetStatus: 'in_progress', label: i18n.t('components.fsm_action_buttons.k5') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k6') },
    ],
    in_progress: [
      { targetStatus: 'completed', label: i18n.t('components.fsm_action_buttons.k7') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k8') },
    ],
  },
  schedule: {
    pending: [
      {
        targetStatus: 'released',
        label: i18n.t('components.fsm_action_buttons.k9'),
        requiresApproval: true,
      },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k10') },
    ],
    released: [
      { targetStatus: 'running', label: i18n.t('components.fsm_action_buttons.k11') },
      { targetStatus: 'pending', label: i18n.t('components.fsm_action_buttons.k12') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k13') },
    ],
    running: [
      { targetStatus: 'completed', label: i18n.t('components.fsm_action_buttons.k14') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k15') },
    ],
  },
  capacity: {
    available: [
      {
        targetStatus: 'allocated',
        label: i18n.t('components.fsm_action_buttons.k16'),
        requiresApproval: true,
      },
      { targetStatus: 'maintenance', label: i18n.t('components.fsm_action_buttons.k17') },
    ],
    allocated: [
      { targetStatus: 'consumed', label: i18n.t('components.fsm_action_buttons.k18') },
      { targetStatus: 'released', label: i18n.t('components.fsm_action_buttons.k19') },
    ],
    maintenance: [
      { targetStatus: 'available', label: i18n.t('components.fsm_action_buttons.k20') },
    ],
    released: [{ targetStatus: 'available', label: i18n.t('components.fsm_action_buttons.k21') }],
  },
  material_plan: {
    pending: [
      {
        targetStatus: 'requisitioned',
        label: i18n.t('components.fsm_action_buttons.k22'),
        requiresApproval: true,
      },
      { targetStatus: 'shortage', label: i18n.t('components.fsm_action_buttons.k23') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k24') },
    ],
    requisitioned: [
      { targetStatus: 'sourced', label: i18n.t('components.fsm_action_buttons.k25') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k26') },
    ],
    sourced: [
      { targetStatus: 'satisfied', label: i18n.t('components.fsm_action_buttons.k27') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k28') },
    ],
    shortage: [
      { targetStatus: 'requisitioned', label: i18n.t('components.fsm_action_buttons.k29') },
    ],
  },
  forecast: {
    draft: [
      { targetStatus: 'calculated', label: i18n.t('components.fsm_action_buttons.k30') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k31') },
    ],
    calculated: [
      { targetStatus: 'validated', label: i18n.t('components.fsm_action_buttons.k32') },
      { targetStatus: 'draft', label: i18n.t('components.fsm_action_buttons.k33') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k34') },
    ],
    validated: [
      {
        targetStatus: 'adopted',
        label: i18n.t('components.fsm_action_buttons.k35'),
        requiresApproval: true,
      },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k36') },
    ],
    adopted: [{ targetStatus: 'superseded', label: i18n.t('components.fsm_action_buttons.k37') }],
  },
};

interface FSMActionButtonsProps {
  /** FSM 类型 */
  fsm: ApsFsmType;
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
            {requiresApproval && i18n.t('components.fsm_action_buttons.k38')}
          </button>
        );
      })}
    </div>
  );
}

export default FSMActionButtons;
