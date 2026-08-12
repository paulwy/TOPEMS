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
      { targetStatus: 'pending_approval', label: '提交审批' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    pending_approval: [
      { targetStatus: 'approved', label: '审批通过', requiresApproval: true },
      { targetStatus: 'draft', label: '驳回' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    approved: [
      { targetStatus: 'in_progress', label: '开始执行' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    in_progress: [
      { targetStatus: 'completed', label: '完成' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
  },
  schedule: {
    pending: [
      { targetStatus: 'released', label: '发布', requiresApproval: true },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    released: [
      { targetStatus: 'running', label: '开始运行' },
      { targetStatus: 'pending', label: '暂停' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    running: [
      { targetStatus: 'completed', label: '完成' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
  },
  capacity: {
    available: [
      { targetStatus: 'allocated', label: '分配', requiresApproval: true },
      { targetStatus: 'maintenance', label: '维护' },
    ],
    allocated: [
      { targetStatus: 'consumed', label: '消耗' },
      { targetStatus: 'released', label: '释放' },
    ],
    maintenance: [{ targetStatus: 'available', label: '恢复可用' }],
    released: [{ targetStatus: 'available', label: '重新可用' }],
  },
  material_plan: {
    pending: [
      { targetStatus: 'requisitioned', label: '请购', requiresApproval: true },
      { targetStatus: 'shortage', label: '标记短缺' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    requisitioned: [
      { targetStatus: 'sourced', label: '已采购' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    sourced: [
      { targetStatus: 'satisfied', label: '满足' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    shortage: [{ targetStatus: 'requisitioned', label: '重新请购' }],
  },
  forecast: {
    draft: [
      { targetStatus: 'calculated', label: '计算' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    calculated: [
      { targetStatus: 'validated', label: '验证' },
      { targetStatus: 'draft', label: '重新计算' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    validated: [
      { targetStatus: 'adopted', label: '采纳', requiresApproval: true },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    adopted: [{ targetStatus: 'superseded', label: '替代' }],
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
            {requiresApproval && ' (审批)'}
          </button>
        );
      })}
    </div>
  );
}

export default FSMActionButtons;
