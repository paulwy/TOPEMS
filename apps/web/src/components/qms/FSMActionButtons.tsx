/**
 * QMS FSM 操作按钮组件
 *
 * 按 7 套 FSM 的可达性表动态渲染操作按钮：
 * - 审批转换（requiresApproval=true）显示 "审批" 风格按钮
 * - 非审批转换显示直接动作按钮
 * - 终态不渲染任何按钮
 *
 * 转换映射与 svc/qms/src/shared/fsm.rs 1:1 对齐。
 */

import type { QmsFsmType } from './StatusBadge';
import i18n from '@/i18n';

interface FSMTransition {
  /** 目标状态 */
  targetStatus: string;
  /** 按钮标签 */
  label: string;
  /** 是否需要审批 */
  requiresApproval?: boolean;
}

// 7 套 FSM 的转换映射表（from → transitions[]）
const FSM_TRANSITIONS: Record<QmsFsmType, Record<string, FSMTransition[]>> = {
  inspection: {
    pending: [{ targetStatus: 'in_progress', label: i18n.t('components.fsm_action_buttons.k0') }],
    in_progress: [{ targetStatus: 'pending_audit', label: i18n.t('components.fsm_action_buttons.k1') }],
    pending_audit: [
      { targetStatus: 'completed', label: i18n.t('components.fsm_action_buttons.k2'), requiresApproval: true },
      { targetStatus: 'rejected', label: i18n.t('components.fsm_action_buttons.k3'), requiresApproval: true },
    ],
    rejected: [{ targetStatus: 'in_progress', label: i18n.t('components.fsm_action_buttons.k4') }],
  },
  issue: {
    open: [
      { targetStatus: 'in_progress', label: i18n.t('components.fsm_action_buttons.k5') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k6') },
    ],
    in_progress: [
      { targetStatus: 'resolved', label: i18n.t('components.fsm_action_buttons.k7') },
      { targetStatus: 'open', label: i18n.t('components.fsm_action_buttons.k8') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k9') },
    ],
    resolved: [
      { targetStatus: 'closed', label: i18n.t('components.fsm_action_buttons.k10'), requiresApproval: true },
      { targetStatus: 'in_progress', label: i18n.t('components.fsm_action_buttons.k11') },
    ],
  },
  action: {
    pending: [
      { targetStatus: 'in_progress', label: i18n.t('components.fsm_action_buttons.k12') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k13') },
    ],
    in_progress: [
      { targetStatus: 'completed', label: i18n.t('components.fsm_action_buttons.k14') },
      { targetStatus: 'pending', label: i18n.t('components.fsm_action_buttons.k15') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k16') },
    ],
    completed: [
      { targetStatus: 'verified', label: i18n.t('components.fsm_action_buttons.k17'), requiresApproval: true },
      { targetStatus: 'in_progress', label: i18n.t('components.fsm_action_buttons.k18') },
    ],
  },
  audit_plan: {
    draft: [
      { targetStatus: 'scheduled', label: i18n.t('components.fsm_action_buttons.k19') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k20') },
    ],
    scheduled: [
      { targetStatus: 'in_progress', label: i18n.t('components.fsm_action_buttons.k21') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k22') },
    ],
    in_progress: [
      { targetStatus: 'completed', label: i18n.t('components.fsm_action_buttons.k23'), requiresApproval: true },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k24') },
    ],
  },
  audit_finding: {
    open: [{ targetStatus: 'in_progress', label: i18n.t('components.fsm_action_buttons.k25') }],
    in_progress: [
      { targetStatus: 'verified', label: i18n.t('components.fsm_action_buttons.k26') },
      { targetStatus: 'open', label: i18n.t('components.fsm_action_buttons.k27') },
    ],
    verified: [
      { targetStatus: 'closed', label: i18n.t('components.fsm_action_buttons.k28'), requiresApproval: true },
      { targetStatus: 'in_progress', label: i18n.t('components.fsm_action_buttons.k29') },
    ],
  },
  eight_d: {
    initiated: [
      { targetStatus: 'in_progress', label: i18n.t('components.fsm_action_buttons.k30') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k31') },
    ],
    in_progress: [
      { targetStatus: 'containment', label: i18n.t('components.fsm_action_buttons.k32') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k33') },
    ],
    containment: [
      { targetStatus: 'root_cause', label: i18n.t('components.fsm_action_buttons.k34') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k35') },
    ],
    root_cause: [
      { targetStatus: 'permanent_action', label: i18n.t('components.fsm_action_buttons.k36') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k37') },
    ],
    permanent_action: [
      { targetStatus: 'verified', label: i18n.t('components.fsm_action_buttons.k38'), requiresApproval: true },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k39') },
    ],
    verified: [{ targetStatus: 'closed', label: i18n.t('components.fsm_action_buttons.k40'), requiresApproval: true }],
  },
  apqp: {
    planning: [
      { targetStatus: 'in_design', label: i18n.t('components.fsm_action_buttons.k41') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k42') },
    ],
    in_design: [
      { targetStatus: 'in_pilot', label: i18n.t('components.fsm_action_buttons.k43') },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k44') },
    ],
    in_pilot: [
      { targetStatus: 'in_production', label: i18n.t('components.fsm_action_buttons.k45'), requiresApproval: true },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k46') },
    ],
    in_production: [
      { targetStatus: 'completed', label: i18n.t('components.fsm_action_buttons.k47'), requiresApproval: true },
      { targetStatus: 'cancelled', label: i18n.t('components.fsm_action_buttons.k48') },
    ],
  },
};

interface FSMActionButtonsProps {
  /** FSM 类型 */
  fsm: QmsFsmType;
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
            {requiresApproval && i18n.t('components.fsm_action_buttons.k49')}
          </button>
        );
      })}
    </div>
  );
}

export default FSMActionButtons;
