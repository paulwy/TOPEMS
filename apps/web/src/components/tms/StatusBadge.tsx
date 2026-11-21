import { STATUS_PALETTE, createFsmStatusBadge } from '@/components/common/StatusBadge';
import i18n from '@/i18n';
/**
 * TMS 状态徽章组件
 *
 * 支持 5 套 FSM（与 svc/tms/src/shared/fsm.rs 1:1 对齐）：
 * - vehicle   : active → maintenance → inactive → retired
 * - driver    : active → on_leave → suspended → inactive
 * - carrier   : pending_review → active → suspended → blacklisted/rejected
 * - route     : planning → active → closed → deprecated/cancelled
 * - shipment  : draft → pending → in_transit → delivered/cancelled
 *
 * 颜色语义：
 * - 灰色  : 初始态（active/draft/planning/pending_review）
 * - 蓝色  : 进行态（maintenance/on_leave/in_transit/pending/active(route/carrier)）
 * - 橙色  : 审批/中间态（inactive/suspended/closed）
 * - 绿色  : 完成态（retired/delivered/deprecated）
 * - 红色  : 拒绝/取消态（blacklisted/rejected/cancelled/inactive(driver)）
 */

export type TmsFsmType = 'vehicle' | 'driver' | 'carrier' | 'route' | 'shipment';

// 每个 FSM 的状态 → 颜色映射
const FSM_STATUS_COLORS: Record<TmsFsmType, Record<string, string>> = {
  vehicle: {
    active: STATUS_PALETTE.gray,
    maintenance: STATUS_PALETTE.blue,
    inactive: STATUS_PALETTE.orange,
    retired: STATUS_PALETTE.green,
  },
  driver: {
    active: STATUS_PALETTE.gray,
    on_leave: STATUS_PALETTE.blue,
    suspended: STATUS_PALETTE.orange,
    inactive: STATUS_PALETTE.red,
  },
  carrier: {
    pending_review: STATUS_PALETTE.gray,
    active: STATUS_PALETTE.blue,
    suspended: STATUS_PALETTE.orange,
    blacklisted: STATUS_PALETTE.red,
    rejected: STATUS_PALETTE.red,
  },
  route: {
    planning: STATUS_PALETTE.gray,
    active: STATUS_PALETTE.blue,
    closed: STATUS_PALETTE.orange,
    deprecated: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  shipment: {
    draft: STATUS_PALETTE.gray,
    pending: STATUS_PALETTE.blue,
    in_transit: STATUS_PALETTE.blue,
    delivered: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
};

// 状态中文标签映射
const STATUS_LABELS: Record<string, string> = {
  active: i18n.t('components.status_badge.k0'),
  maintenance: i18n.t('components.status_badge.k1'),
  inactive: i18n.t('components.status_badge.k2'),
  retired: i18n.t('components.status_badge.k3'),
  on_leave: i18n.t('components.status_badge.k4'),
  suspended: i18n.t('components.status_badge.k5'),
  pending_review: i18n.t('components.status_badge.k6'),
  blacklisted: i18n.t('components.status_badge.k7'),
  rejected: i18n.t('components.status_badge.k8'),
  planning: i18n.t('components.status_badge.k9'),
  closed: i18n.t('components.status_badge.k10'),
  deprecated: i18n.t('components.status_badge.k11'),
  cancelled: i18n.t('components.status_badge.k12'),
  draft: i18n.t('components.status_badge.k13'),
  pending: i18n.t('components.status_badge.k14'),
  in_transit: i18n.t('components.status_badge.k15'),
  delivered: i18n.t('components.status_badge.k16'),
};

export const StatusBadge = createFsmStatusBadge<TmsFsmType>(FSM_STATUS_COLORS, STATUS_LABELS);

export default StatusBadge;
