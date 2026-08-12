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
    { action: 'confirm', label: '确认', from: 'created', to: 'confirmed' },
    { action: 'revert_created', label: '退回创建', from: 'confirmed', to: 'created' },
    { action: 'receive', label: '收货', from: 'confirmed', to: 'received' },
    { action: 'reject_receive', label: '拒收回流', from: 'received', to: 'confirmed' },
    {
      action: 'complete',
      label: '完成',
      from: 'received',
      to: 'completed',
      requiresApproval: true,
    },
    { action: 'cancel', label: '取消', from: 'created', to: 'cancelled' },
    { action: 'cancel', label: '取消', from: 'confirmed', to: 'cancelled' },
  ],

  // FSM-2 Outbound: created→confirmed→picking→packing→shipping→completed,
  // packing→picking(reject回流), created|confirmed|picking|packing→cancelled;
  // approval: packing→shipping
  outbound: [
    { action: 'confirm', label: '确认', from: 'created', to: 'confirmed' },
    { action: 'start_pick', label: '开始拣货', from: 'confirmed', to: 'picking' },
    { action: 'start_pack', label: '开始包装', from: 'picking', to: 'packing' },
    { action: 'reject_pack', label: '回流拣货', from: 'packing', to: 'picking' },
    {
      action: 'start_ship',
      label: '发运',
      from: 'packing',
      to: 'shipping',
      requiresApproval: true,
    },
    { action: 'complete', label: '完成', from: 'shipping', to: 'completed' },
    { action: 'cancel', label: '取消', from: 'created', to: 'cancelled' },
    { action: 'cancel', label: '取消', from: 'confirmed', to: 'cancelled' },
    { action: 'cancel', label: '取消', from: 'picking', to: 'cancelled' },
    { action: 'cancel', label: '取消', from: 'packing', to: 'cancelled' },
  ],

  // FSM-3 StockTake: planned→in_progress→completed,
  // planned|in_progress→cancelled; approval: in_progress→completed
  stocktake: [
    { action: 'start', label: '开始盘点', from: 'planned', to: 'in_progress' },
    {
      action: 'complete',
      label: '完成盘点',
      from: 'in_progress',
      to: 'completed',
      requiresApproval: true,
    },
    { action: 'cancel', label: '取消', from: 'planned', to: 'cancelled' },
    { action: 'cancel', label: '取消', from: 'in_progress', to: 'cancelled' },
  ],

  // FSM-4 Transfer: pending↔confirmed, confirmed→shipped→received→completed,
  // confirmed→pending(reject回流), pending|confirmed|shipped|received→cancelled;
  // approval: confirmed→shipped
  transfer: [
    { action: 'confirm', label: '确认', from: 'pending', to: 'confirmed' },
    { action: 'reject_confirm', label: '退回待处理', from: 'confirmed', to: 'pending' },
    {
      action: 'ship',
      label: '发运',
      from: 'confirmed',
      to: 'shipped',
      requiresApproval: true,
    },
    { action: 'receive', label: '收货', from: 'shipped', to: 'received' },
    { action: 'complete', label: '完成', from: 'received', to: 'completed' },
    { action: 'cancel', label: '取消', from: 'pending', to: 'cancelled' },
    { action: 'cancel', label: '取消', from: 'confirmed', to: 'cancelled' },
    { action: 'cancel', label: '取消', from: 'shipped', to: 'cancelled' },
    { action: 'cancel', label: '取消', from: 'received', to: 'cancelled' },
  ],

  // FSM-5 WavePick: created→assigned→picking→completed,
  // created|assigned|picking→cancelled; 无审批
  wavepick: [
    { action: 'assign', label: '分配拣货员', from: 'created', to: 'assigned' },
    { action: 'start_pick', label: '开始拣货', from: 'assigned', to: 'picking' },
    { action: 'complete', label: '完成', from: 'picking', to: 'completed' },
    { action: 'cancel', label: '取消', from: 'created', to: 'cancelled' },
    { action: 'cancel', label: '取消', from: 'assigned', to: 'cancelled' },
    { action: 'cancel', label: '取消', from: 'picking', to: 'cancelled' },
  ],

  // FSM-6 InventoryMovement: draft→posted→completed,
  // draft|posted→cancelled; approval: posted→completed
  movement: [
    { action: 'post', label: '过账', from: 'draft', to: 'posted' },
    {
      action: 'complete',
      label: '完成',
      from: 'posted',
      to: 'completed',
      requiresApproval: true,
    },
    { action: 'cancel', label: '取消', from: 'draft', to: 'cancelled' },
    { action: 'cancel', label: '取消', from: 'posted', to: 'cancelled' },
  ],

  // FSM-7 SerialNumber: pending→assigned→used→archived; 无审批
  serial: [
    { action: 'assign', label: '分配', from: 'pending', to: 'assigned' },
    { action: 'use', label: '使用', from: 'assigned', to: 'used' },
    { action: 'archive', label: '归档', from: 'used', to: 'archived' },
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
            {requiresApproval && '（审批）'}
          </button>
        );
      })}
    </div>
  );
}

export default WmsFSMActionButtons;
