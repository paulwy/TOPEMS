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
      { targetStatus: 'maintenance', label: '提交检修' },
      { targetStatus: 'retired', label: '直接退役' },
    ],
    maintenance: [
      { targetStatus: 'active', label: '恢复运行' },
      { targetStatus: 'inactive', label: '转为停用' },
    ],
    inactive: [
      { targetStatus: 'active', label: '恢复运行' },
      { targetStatus: 'retired', label: '退役', requiresApproval: true },
    ],
  },
  driver: {
    active: [
      { targetStatus: 'on_leave', label: '请假' },
      { targetStatus: 'suspended', label: '暂停' },
    ],
    on_leave: [
      { targetStatus: 'active', label: '恢复上岗' },
      { targetStatus: 'inactive', label: '转为停用' },
    ],
    suspended: [
      { targetStatus: 'active', label: '恢复上岗' },
      { targetStatus: 'inactive', label: '停用', requiresApproval: true },
    ],
  },
  carrier: {
    pending_review: [
      { targetStatus: 'active', label: '审核通过', requiresApproval: true },
      { targetStatus: 'rejected', label: '拒绝' },
    ],
    active: [{ targetStatus: 'suspended', label: '暂停' }],
    suspended: [
      { targetStatus: 'active', label: '恢复' },
      { targetStatus: 'blacklisted', label: '拉黑' },
    ],
  },
  route: {
    planning: [
      { targetStatus: 'active', label: '启用', requiresApproval: true },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    active: [{ targetStatus: 'closed', label: '关闭' }],
    closed: [
      { targetStatus: 'active', label: '重新启用' },
      { targetStatus: 'deprecated', label: '废弃' },
    ],
  },
  shipment: {
    draft: [
      { targetStatus: 'pending', label: '提交审批' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    pending: [
      { targetStatus: 'in_transit', label: '审批发车', requiresApproval: true },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    in_transit: [
      { targetStatus: 'delivered', label: '确认送达' },
      { targetStatus: 'cancelled', label: '取消' },
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
            {requiresApproval && ' (审批)'}
          </button>
        );
      })}
    </div>
  );
}

export default FSMActionButtons;
