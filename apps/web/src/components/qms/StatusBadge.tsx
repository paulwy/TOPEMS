import { STATUS_PALETTE, createFsmStatusBadge } from '@/components/common/StatusBadge';
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

// 每个 FSM 的状态 → 颜色映射
const FSM_STATUS_COLORS: Record<QmsFsmType, Record<string, string>> = {
  inspection: {
    pending: STATUS_PALETTE.gray,
    in_progress: STATUS_PALETTE.blue,
    pending_audit: STATUS_PALETTE.orange,
    completed: STATUS_PALETTE.green,
    rejected: STATUS_PALETTE.red,
  },
  issue: {
    open: STATUS_PALETTE.gray,
    in_progress: STATUS_PALETTE.blue,
    resolved: STATUS_PALETTE.orange,
    closed: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  action: {
    pending: STATUS_PALETTE.gray,
    in_progress: STATUS_PALETTE.blue,
    completed: STATUS_PALETTE.orange,
    verified: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  audit_plan: {
    draft: STATUS_PALETTE.gray,
    scheduled: STATUS_PALETTE.blue,
    in_progress: STATUS_PALETTE.blue,
    completed: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  audit_finding: {
    open: STATUS_PALETTE.gray,
    in_progress: STATUS_PALETTE.blue,
    verified: STATUS_PALETTE.orange,
    closed: STATUS_PALETTE.green,
  },
  eight_d: {
    initiated: STATUS_PALETTE.gray,
    in_progress: STATUS_PALETTE.blue,
    containment: STATUS_PALETTE.blue,
    root_cause: STATUS_PALETTE.purple,
    permanent_action: STATUS_PALETTE.orange,
    verified: STATUS_PALETTE.orange,
    closed: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  apqp: {
    planning: STATUS_PALETTE.gray,
    in_design: STATUS_PALETTE.blue,
    in_pilot: STATUS_PALETTE.orange,
    in_production: STATUS_PALETTE.orange,
    completed: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
};

// 状态中文标签映射（跨 FSM 通用，状态值相同时取同一标签）
const STATUS_LABELS: Record<string, string> = {
  // 批注：这一组此前整体错位——pending 显示「草稿」、in_progress 显示「待审批」、
  // pending_audit 显示「已审批」、completed 显示「进行中」、rejected 显示「已完成」、
  // cancelled 显示「运行中」。现按语义重新对齐（检验单 completed 在详情页显示成
  // 「进行中」、已取消检验单显示成「运行中」均由此而来）。
  pending: i18n.t('qms.nonconformance.k16'),
  in_progress: i18n.t('components.status_badge.k3'),
  pending_audit: i18n.t('components.status_badge.k1'),
  completed: i18n.t('components.status_badge.k4'),
  rejected: i18n.t('qms.inspection.k26'),
  open: i18n.t('qms.nonconformance.k16'),
  resolved: i18n.t('qms.nonconformance.k19'),
  closed: i18n.t('qms.nonconformance.k18'),
  cancelled: i18n.t('components.status_badge.k5'),
  draft: i18n.t('components.status_badge.k0'),
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

export const StatusBadge = createFsmStatusBadge<QmsFsmType>(FSM_STATUS_COLORS, STATUS_LABELS);

export default StatusBadge;
