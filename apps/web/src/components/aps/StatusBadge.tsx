import { STATUS_PALETTE, createFsmStatusBadge } from '@/components/common/StatusBadge';
import i18n from '@/i18n';
/**
 * APS 状态徽章组件
 *
 * 支持 5 套 FSM（与 svc/aps/src/shared/fsm.rs 1:1 对齐）：
 * - production_plan : draft → pending_approval → approved → in_progress → completed
 * - schedule        : pending → released → running → completed
 * - capacity        : available → allocated → consumed
 * - material_plan   : pending → requisitioned → sourced → satisfied
 * - forecast        : draft → calculated → validated → adopted
 *
 * 颜色语义：
 * - 灰色  : 初始态（draft/pending/available）
 * - 蓝色  : 进行态（in_progress/running/released/sourced/calculated）
 * - 橙色  : 审批/中间态（pending_approval/approved/allocated/requisitioned/validated）
 * - 绿色  : 完成态（completed/consumed/satisfied/adopted）
 * - 红色  : 取消/短缺态（cancelled/shortage）
 * - 紫色  : 其他中间态（maintenance/superseded）
 */

export type ApsFsmType = 'production_plan' | 'schedule' | 'capacity' | 'material_plan' | 'forecast';

// 每个 FSM 的状态 → 颜色映射
const FSM_STATUS_COLORS: Record<ApsFsmType, Record<string, string>> = {
  production_plan: {
    draft: STATUS_PALETTE.gray,
    pending_approval: STATUS_PALETTE.orange,
    approved: STATUS_PALETTE.blue,
    in_progress: STATUS_PALETTE.blue,
    completed: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  schedule: {
    pending: STATUS_PALETTE.gray,
    released: STATUS_PALETTE.blue,
    running: STATUS_PALETTE.blue,
    completed: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  capacity: {
    available: STATUS_PALETTE.gray,
    allocated: STATUS_PALETTE.orange,
    consumed: STATUS_PALETTE.green,
    maintenance: STATUS_PALETTE.purple,
    released: STATUS_PALETTE.blue,
  },
  material_plan: {
    pending: STATUS_PALETTE.gray,
    requisitioned: STATUS_PALETTE.orange,
    sourced: STATUS_PALETTE.blue,
    satisfied: STATUS_PALETTE.green,
    shortage: STATUS_PALETTE.red,
    cancelled: STATUS_PALETTE.red,
  },
  forecast: {
    draft: STATUS_PALETTE.gray,
    calculated: STATUS_PALETTE.blue,
    validated: STATUS_PALETTE.orange,
    adopted: STATUS_PALETTE.green,
    superseded: STATUS_PALETTE.purple,
    cancelled: STATUS_PALETTE.red,
  },
};

// 状态中文标签映射（跨 FSM 通用，状态值相同时取同一标签）
const STATUS_LABELS: Record<string, string> = {
  draft: i18n.t('components.status_badge.k0'),
  pending_approval: i18n.t('components.status_badge.k1'),
  approved: i18n.t('components.status_badge.k2'),
  in_progress: i18n.t('components.status_badge.k3'),
  completed: i18n.t('components.status_badge.k4'),
  cancelled: i18n.t('components.status_badge.k5'),
  pending: i18n.t('components.status_badge.k6'),
  released: i18n.t('components.status_badge.k7'),
  running: i18n.t('components.status_badge.k8'),
  available: i18n.t('components.status_badge.k9'),
  allocated: i18n.t('components.status_badge.k10'),
  consumed: i18n.t('components.status_badge.k11'),
  maintenance: i18n.t('components.status_badge.k12'),
  requisitioned: i18n.t('components.status_badge.k13'),
  sourced: i18n.t('components.status_badge.k14'),
  satisfied: i18n.t('components.status_badge.k15'),
  shortage: i18n.t('components.status_badge.k16'),
  calculated: i18n.t('components.status_badge.k17'),
  validated: i18n.t('components.status_badge.k18'),
  adopted: i18n.t('components.status_badge.k19'),
  superseded: i18n.t('components.status_badge.k20'),
};

export const StatusBadge = createFsmStatusBadge<ApsFsmType>(FSM_STATUS_COLORS, STATUS_LABELS);

export default StatusBadge;
