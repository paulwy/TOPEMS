import i18n from '@/i18n';
/**
 * QMS 状态徽章组件
 *
 * 支持 7 套 FSM（与 svc/qms/src/shared/fsm.rs 1:1 对齐）：
 * - inspection    : pending → in_progress → pending_audit → completed/rejected
 * - issue         : open → in_progress → resolved → closed/cancelled
 * - action        : pending → in_progress → completed → verified/cancelled
 * - audit_plan    : draft → scheduled → in_progress → completed/cancelled
 * - audit_finding : open → in_progress → verified → closed
 * - eight_d       : initiated → in_progress → containment → root_cause → permanent_action → verified → closed/cancelled
 * - apqp          : planning → in_design → in_pilot → in_production → completed/cancelled
 *
 * 颜色语义：
 * - 灰色  : 初始态（pending/open/draft/initiated/planning）
 * - 蓝色  : 进行态（in_progress/scheduled/containment/in_design）
 * - 橙色  : 审批/中间态（pending_audit/resolved/completed(action)/verified/permanent_action/in_pilot/in_production）
 * - 绿色  : 完成态（completed/closed/verified(action)）
 * - 红色  : 拒绝/取消态（rejected/cancelled）
 * - 紫色  : 其他中间态（root_cause）
 */

export type QmsFsmType =
  'inspection' | 'issue' | 'action' | 'audit_plan' | 'audit_finding' | 'eight_d' | 'apqp';

const GRAY = 'bg-gray-100 text-gray-700';
const BLUE = 'bg-blue-100 text-blue-700';
const ORANGE = 'bg-orange-100 text-orange-700';
const GREEN = 'bg-green-100 text-green-700';
const RED = 'bg-red-100 text-red-700';
const PURPLE = 'bg-purple-100 text-purple-700';
const DEFAULT_COLOR = GRAY;

// 每个 FSM 的状态 → 颜色映射
const FSM_STATUS_COLORS: Record<QmsFsmType, Record<string, string>> = {
  inspection: {
    pending: GRAY,
    in_progress: BLUE,
    pending_audit: ORANGE,
    completed: GREEN,
    rejected: RED,
  },
  issue: {
    open: GRAY,
    in_progress: BLUE,
    resolved: ORANGE,
    closed: GREEN,
    cancelled: RED,
  },
  action: {
    pending: GRAY,
    in_progress: BLUE,
    completed: ORANGE,
    verified: GREEN,
    cancelled: RED,
  },
  audit_plan: {
    draft: GRAY,
    scheduled: BLUE,
    in_progress: BLUE,
    completed: GREEN,
    cancelled: RED,
  },
  audit_finding: {
    open: GRAY,
    in_progress: BLUE,
    verified: ORANGE,
    closed: GREEN,
  },
  eight_d: {
    initiated: GRAY,
    in_progress: BLUE,
    containment: BLUE,
    root_cause: PURPLE,
    permanent_action: ORANGE,
    verified: ORANGE,
    closed: GREEN,
    cancelled: RED,
  },
  apqp: {
    planning: GRAY,
    in_design: BLUE,
    in_pilot: ORANGE,
    in_production: ORANGE,
    completed: GREEN,
    cancelled: RED,
  },
};

// 状态中文标签映射（跨 FSM 通用，状态值相同时取同一标签）
const STATUS_LABELS: Record<string, string> = {
  pending: i18n.t('components.status_badge.k0'),
  in_progress: i18n.t('components.status_badge.k1'),
  pending_audit: i18n.t('components.status_badge.k2'),
  completed: i18n.t('components.status_badge.k3'),
  rejected: i18n.t('components.status_badge.k4'),
  open: i18n.t('components.status_badge.k5'),
  resolved: i18n.t('components.status_badge.k6'),
  closed: i18n.t('components.status_badge.k7'),
  cancelled: i18n.t('components.status_badge.k8'),
  draft: i18n.t('components.status_badge.k9'),
  scheduled: i18n.t('components.status_badge.k10'),
  verified: i18n.t('components.status_badge.k11'),
  initiated: i18n.t('components.status_badge.k12'),
  containment: i18n.t('components.status_badge.k13'),
  root_cause: i18n.t('components.status_badge.k14'),
  permanent_action: i18n.t('components.status_badge.k15'),
  planning: i18n.t('components.status_badge.k16'),
  in_design: i18n.t('components.status_badge.k17'),
  in_pilot: i18n.t('components.status_badge.k18'),
  in_production: i18n.t('components.status_badge.k19'),
};

interface StatusBadgeProps {
  /** FSM 类型 */
  fsm: QmsFsmType;
  /** 当前状态值 */
  status: string;
  /** 自定义标签（不传则使用内置中文标签，再退化到原始 status） */
  label?: string;
}

export function StatusBadge({ fsm, status, label }: StatusBadgeProps) {
  const colorClass = FSM_STATUS_COLORS[fsm]?.[status] ?? DEFAULT_COLOR;
  const text = label ?? STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {text}
    </span>
  );
}

export default StatusBadge;
