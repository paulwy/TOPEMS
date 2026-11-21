import { STATUS_PALETTE, createFsmStatusBadge } from '@/components/common/StatusBadge';
import i18n from '@/i18n';
/**
 * WMS 状态徽章组件
 *
 * 支持 7 套 FSM（与 svc/wms/src/shared/fsm.rs 1:1 对齐）：
 * - inbound    : created ↔ confirmed → received → completed; received→confirmed reject; created|confirmed→cancelled; approval: received→completed
 * - outbound   : created→confirmed→picking→packing→shipping→completed; packing→picking reject; created|confirmed|picking|packing→cancelled; approval: packing→shipping
 * - stocktake  : planned→in_progress→completed; planned|in_progress→cancelled; approval: in_progress→completed
 * - transfer   : pending↔confirmed→shipped→received→completed; confirmed→pending reject; all→cancelled; approval: confirmed→shipped
 * - wavepick   : created→assigned→picking→completed; all→cancelled; 无审批
 * - movement   : draft→posted→completed; draft|posted→cancelled; approval: posted→completed
 * - serial     : pending→assigned→used→archived; 无审批
 *
 * 颜色语义：
 * - 灰色  : 初始态（created/draft/planned/pending）
 * - 蓝色  : 进行态（confirmed/picking/packing/shipped/received/in_progress/assigned/posted/used）
 * - 橙色  : 审批态（received(inbound)/packing(outbound)/confirmed(transfer)/posted(movement)/in_progress(stocktake)）
 * - 绿色  : 完成态（completed/archived）
 * - 红色  : 取消态（cancelled）
 * - 紫色  : 其他中间态（无）
 */

export type WmsFsm =
  'inbound' | 'outbound' | 'stocktake' | 'transfer' | 'wavepick' | 'movement' | 'serial';

const FSM_STATUS_COLORS: Record<WmsFsm, Record<string, string>> = {
  inbound: {
    created: STATUS_PALETTE.gray,
    confirmed: STATUS_PALETTE.blue,
    received: STATUS_PALETTE.orange,
    completed: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  outbound: {
    created: STATUS_PALETTE.gray,
    confirmed: STATUS_PALETTE.blue,
    picking: STATUS_PALETTE.blue,
    packing: STATUS_PALETTE.orange,
    shipping: STATUS_PALETTE.blue,
    completed: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  stocktake: {
    planned: STATUS_PALETTE.gray,
    in_progress: STATUS_PALETTE.orange,
    completed: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  transfer: {
    pending: STATUS_PALETTE.gray,
    confirmed: STATUS_PALETTE.orange,
    shipped: STATUS_PALETTE.blue,
    received: STATUS_PALETTE.blue,
    completed: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  wavepick: {
    created: STATUS_PALETTE.gray,
    assigned: STATUS_PALETTE.blue,
    picking: STATUS_PALETTE.blue,
    completed: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  movement: {
    draft: STATUS_PALETTE.gray,
    posted: STATUS_PALETTE.orange,
    completed: STATUS_PALETTE.green,
    cancelled: STATUS_PALETTE.red,
  },
  serial: {
    pending: STATUS_PALETTE.gray,
    assigned: STATUS_PALETTE.blue,
    used: STATUS_PALETTE.blue,
    archived: STATUS_PALETTE.green,
  },
};

const STATUS_LABELS: Record<string, string> = {
  created: i18n.t('components.status_badge.k0'),
  draft: i18n.t('components.status_badge.k1'),
  planned: i18n.t('components.status_badge.k2'),
  pending: i18n.t('components.status_badge.k3'),
  confirmed: i18n.t('components.status_badge.k4'),
  assigned: i18n.t('components.status_badge.k5'),
  picking: i18n.t('components.status_badge.k6'),
  packing: i18n.t('components.status_badge.k7'),
  shipping: i18n.t('components.status_badge.k8'),
  shipped: i18n.t('components.status_badge.k9'),
  received: i18n.t('components.status_badge.k10'),
  in_progress: i18n.t('components.status_badge.k11'),
  posted: i18n.t('components.status_badge.k12'),
  used: i18n.t('components.status_badge.k13'),
  completed: i18n.t('components.status_badge.k14'),
  archived: i18n.t('components.status_badge.k15'),
  cancelled: i18n.t('components.status_badge.k16'),
};

export const WmsStatusBadge = createFsmStatusBadge<WmsFsm>(FSM_STATUS_COLORS, STATUS_LABELS, {
  fallbackColor: 'bg-yellow-50 text-yellow-700',
});

export default WmsStatusBadge;
