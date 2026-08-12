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
    pending: [{ targetStatus: 'in_progress', label: '开始检验' }],
    in_progress: [{ targetStatus: 'pending_audit', label: '提交审核' }],
    pending_audit: [
      { targetStatus: 'completed', label: '审核通过', requiresApproval: true },
      { targetStatus: 'rejected', label: '审核驳回', requiresApproval: true },
    ],
    rejected: [{ targetStatus: 'in_progress', label: '返工' }],
  },
  issue: {
    open: [
      { targetStatus: 'in_progress', label: '开始处理' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    in_progress: [
      { targetStatus: 'resolved', label: '标记解决' },
      { targetStatus: 'open', label: '重新打开' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    resolved: [
      { targetStatus: 'closed', label: '关闭', requiresApproval: true },
      { targetStatus: 'in_progress', label: '重新处理' },
    ],
  },
  action: {
    pending: [
      { targetStatus: 'in_progress', label: '开始执行' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    in_progress: [
      { targetStatus: 'completed', label: '标记完成' },
      { targetStatus: 'pending', label: '退回待处理' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    completed: [
      { targetStatus: 'verified', label: '验证', requiresApproval: true },
      { targetStatus: 'in_progress', label: '重新执行' },
    ],
  },
  audit_plan: {
    draft: [
      { targetStatus: 'scheduled', label: '排程' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    scheduled: [
      { targetStatus: 'in_progress', label: '开始审核' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    in_progress: [
      { targetStatus: 'completed', label: '完成审核', requiresApproval: true },
      { targetStatus: 'cancelled', label: '取消' },
    ],
  },
  audit_finding: {
    open: [{ targetStatus: 'in_progress', label: '开始处理' }],
    in_progress: [
      { targetStatus: 'verified', label: '提交验证' },
      { targetStatus: 'open', label: '重新打开' },
    ],
    verified: [
      { targetStatus: 'closed', label: '关闭', requiresApproval: true },
      { targetStatus: 'in_progress', label: '重新处理' },
    ],
  },
  eight_d: {
    initiated: [
      { targetStatus: 'in_progress', label: '启动团队' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    in_progress: [
      { targetStatus: 'containment', label: '实施临时措施' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    containment: [
      { targetStatus: 'root_cause', label: '根因分析' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    root_cause: [
      { targetStatus: 'permanent_action', label: '制定永久措施' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    permanent_action: [
      { targetStatus: 'verified', label: '验证', requiresApproval: true },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    verified: [{ targetStatus: 'closed', label: '关闭', requiresApproval: true }],
  },
  apqp: {
    planning: [
      { targetStatus: 'in_design', label: '进入设计' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    in_design: [
      { targetStatus: 'in_pilot', label: '进入试点' },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    in_pilot: [
      { targetStatus: 'in_production', label: '进入生产', requiresApproval: true },
      { targetStatus: 'cancelled', label: '取消' },
    ],
    in_production: [
      { targetStatus: 'completed', label: '项目完成', requiresApproval: true },
      { targetStatus: 'cancelled', label: '取消' },
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
            {requiresApproval && ' (审批)'}
          </button>
        );
      })}
    </div>
  );
}

export default FSMActionButtons;
