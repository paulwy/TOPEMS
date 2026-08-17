/**
 * WMS FSM 操作按钮组件
 *
 * 按 7 套 FSM 的可达性表动态渲染操作按钮：
 * - 审批转换（requiresApproval=true）显示 "（审批）" 后缀 + 琥珀色样式
 * - 非审批转换显示蓝色直接动作按钮
 * - 终态（completed/cancelled/archived）不渲染任何按钮
 *
 * 转换映射与 svc/wms/src/shared/fsm.rs 1:1 对齐。
 */

import type { WmsFsm } from './StatusBadge';
import i18n from '@/i18n';

interface FSMTransition {
  action: string;
  label: string;
  from: string;
  to: string;
  requiresApproval?: boolean;
}

// 7 套 FSM 的 allowed_transitions（严格按 Task 0 spec 列表）
const ALLOWED_TRANSITIONS: Record<WmsFsm, FSMTransition[]> = {
  // FSM-1 Inbound: created↔confirmed, confirmed↔received, received→completed,
  // received→confirmed(reject回流), created|confirmed→cancelled; approval: received→completed
  inbound: [
    {
      action: 'confirm',
      label: i18n.t('components.fsm_action_buttons.k0'),
      from: 'created',
      to: 'confirmed',
    },
    {
      action: 'revert_created',
      label: i18n.t('components.fsm_action_buttons.k1'),
      from: 'confirmed',
      to: 'created',
    },
    {
      action: 'receive',
      label: i18n.t('components.fsm_action_buttons.k2'),
      from: 'confirmed',
      to: 'received',
    },
    {
      action: 'reject_receive',
      label: i18n.t('components.fsm_action_buttons.k3'),
      from: 'received',
      to: 'confirmed',
    },
    {
      action: 'complete',
      label: i18n.t('components.fsm_action_buttons.k4'),
      from: 'received',
      to: 'completed',
      requiresApproval: true,
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k5'),
      from: 'created',
      to: 'cancelled',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k6'),
      from: 'confirmed',
      to: 'cancelled',
    },
  ],

  // FSM-2 Outbound: created→confirmed→picking→packing→shipping→completed,
  // packing→picking(reject回流), created|confirmed|picking|packing→cancelled;
  // approval: packing→shipping
  outbound: [
    {
      action: 'confirm',
      label: i18n.t('components.fsm_action_buttons.k7'),
      from: 'created',
      to: 'confirmed',
    },
    {
      action: 'start_pick',
      label: i18n.t('components.fsm_action_buttons.k8'),
      from: 'confirmed',
      to: 'picking',
    },
    {
      action: 'start_pack',
      label: i18n.t('components.fsm_action_buttons.k9'),
      from: 'picking',
      to: 'packing',
    },
    {
      action: 'reject_pack',
      label: i18n.t('components.fsm_action_buttons.k10'),
      from: 'packing',
      to: 'picking',
    },
    {
      action: 'start_ship',
      label: i18n.t('components.fsm_action_buttons.k11'),
      from: 'packing',
      to: 'shipping',
      requiresApproval: true,
    },
    {
      action: 'complete',
      label: i18n.t('components.fsm_action_buttons.k12'),
      from: 'shipping',
      to: 'completed',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k13'),
      from: 'created',
      to: 'cancelled',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k14'),
      from: 'confirmed',
      to: 'cancelled',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k15'),
      from: 'picking',
      to: 'cancelled',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k16'),
      from: 'packing',
      to: 'cancelled',
    },
  ],

  // FSM-3 StockTake: planned→in_progress→completed,
  // planned|in_progress→cancelled; approval: in_progress→completed
  stocktake: [
    {
      action: 'start',
      label: i18n.t('components.fsm_action_buttons.k17'),
      from: 'planned',
      to: 'in_progress',
    },
    {
      action: 'complete',
      label: i18n.t('components.fsm_action_buttons.k18'),
      from: 'in_progress',
      to: 'completed',
      requiresApproval: true,
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k19'),
      from: 'planned',
      to: 'cancelled',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k20'),
      from: 'in_progress',
      to: 'cancelled',
    },
  ],

  // FSM-4 Transfer: pending↔confirmed, confirmed→shipped→received→completed,
  // confirmed→pending(reject回流), pending|confirmed|shipped|received→cancelled;
  // approval: confirmed→shipped
  transfer: [
    {
      action: 'confirm',
      label: i18n.t('components.fsm_action_buttons.k21'),
      from: 'pending',
      to: 'confirmed',
    },
    {
      action: 'reject_confirm',
      label: i18n.t('components.fsm_action_buttons.k22'),
      from: 'confirmed',
      to: 'pending',
    },
    {
      action: 'ship',
      label: i18n.t('components.fsm_action_buttons.k23'),
      from: 'confirmed',
      to: 'shipped',
      requiresApproval: true,
    },
    {
      action: 'receive',
      label: i18n.t('components.fsm_action_buttons.k24'),
      from: 'shipped',
      to: 'received',
    },
    {
      action: 'complete',
      label: i18n.t('components.fsm_action_buttons.k25'),
      from: 'received',
      to: 'completed',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k26'),
      from: 'pending',
      to: 'cancelled',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k27'),
      from: 'confirmed',
      to: 'cancelled',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k28'),
      from: 'shipped',
      to: 'cancelled',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k29'),
      from: 'received',
      to: 'cancelled',
    },
  ],

  // FSM-5 WavePick: created→assigned→picking→completed,
  // created|assigned|picking→cancelled; 无审批
  wavepick: [
    {
      action: 'assign',
      label: i18n.t('components.fsm_action_buttons.k30'),
      from: 'created',
      to: 'assigned',
    },
    {
      action: 'start_pick',
      label: i18n.t('components.fsm_action_buttons.k31'),
      from: 'assigned',
      to: 'picking',
    },
    {
      action: 'complete',
      label: i18n.t('components.fsm_action_buttons.k32'),
      from: 'picking',
      to: 'completed',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k33'),
      from: 'created',
      to: 'cancelled',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k34'),
      from: 'assigned',
      to: 'cancelled',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k35'),
      from: 'picking',
      to: 'cancelled',
    },
  ],

  // FSM-6 InventoryMovement: draft→posted→completed,
  // draft|posted→cancelled; approval: posted→completed
  movement: [
    {
      action: 'post',
      label: i18n.t('components.fsm_action_buttons.k36'),
      from: 'draft',
      to: 'posted',
    },
    {
      action: 'complete',
      label: i18n.t('components.fsm_action_buttons.k37'),
      from: 'posted',
      to: 'completed',
      requiresApproval: true,
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k38'),
      from: 'draft',
      to: 'cancelled',
    },
    {
      action: 'cancel',
      label: i18n.t('components.fsm_action_buttons.k39'),
      from: 'posted',
      to: 'cancelled',
    },
  ],

  // FSM-7 SerialNumber: pending→assigned→used→archived; 无审批
  serial: [
    {
      action: 'assign',
      label: i18n.t('components.fsm_action_buttons.k40'),
      from: 'pending',
      to: 'assigned',
    },
    {
      action: 'use',
      label: i18n.t('components.fsm_action_buttons.k41'),
      from: 'assigned',
      to: 'used',
    },
    {
      action: 'archive',
      label: i18n.t('components.fsm_action_buttons.k42'),
      from: 'used',
      to: 'archived',
    },
  ],
};

interface WmsFSMActionButtonsProps {
  fsm: WmsFsm;
  currentStatus: string;
  onAction: (action: string, from: string, to: string) => void;
  disabled?: boolean;
}

export function WmsFSMActionButtons({
  fsm,
  currentStatus,
  onAction,
  disabled,
}: WmsFSMActionButtonsProps) {
  const statusLower = currentStatus?.toLowerCase() ?? '';
  const transitions = ALLOWED_TRANSITIONS[fsm]?.filter((t) => t.from === statusLower) ?? [];

  if (transitions.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-wrap gap-2'>
      {transitions.map((t) => {
        const key = `${t.action}_${t.from}_${t.to}`;
        const requiresApproval = t.requiresApproval === true;
        return (
          <button
            key={key}
            type='button'
            disabled={disabled}
            onClick={() => onAction(t.action, t.from, t.to)}
            className={
              requiresApproval
                ? 'inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50'
                : 'inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
            }
          >
            {t.label}
            {requiresApproval && i18n.t('components.fsm_action_buttons.k43')}
          </button>
        );
      })}
    </div>
  );
}

export default WmsFSMActionButtons;
