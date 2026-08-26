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

const GRAY = 'bg-gray-100 text-gray-700';
const BLUE = 'bg-blue-100 text-blue-700';
const ORANGE = 'bg-orange-100 text-orange-700';
const GREEN = 'bg-green-100 text-green-700';
const RED = 'bg-red-100 text-red-700';
const YELLOW = 'bg-yellow-50 text-yellow-700';
const DEFAULT_COLOR = GRAY;

const FSM_STATUS_COLORS: Record<WmsFsm, Record<string, string>> = {
  inbound: {
    created: GRAY,
    confirmed: BLUE,
    received: ORANGE,
    completed: GREEN,
    cancelled: RED,
  },
  outbound: {
    created: GRAY,
    confirmed: BLUE,
    picking: BLUE,
    packing: ORANGE,
    shipping: BLUE,
    completed: GREEN,
    cancelled: RED,
  },
  stocktake: {
    planned: GRAY,
    in_progress: ORANGE,
    completed: GREEN,
    cancelled: RED,
  },
  transfer: {
    pending: GRAY,
    confirmed: ORANGE,
    shipped: BLUE,
    received: BLUE,
    completed: GREEN,
    cancelled: RED,
  },
  wavepick: {
    created: GRAY,
    assigned: BLUE,
    picking: BLUE,
    completed: GREEN,
    cancelled: RED,
  },
  movement: {
    draft: GRAY,
    posted: ORANGE,
    completed: GREEN,
    cancelled: RED,
  },
  serial: {
    pending: GRAY,
    assigned: BLUE,
    used: BLUE,
    archived: GREEN,
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

interface WmsStatusBadgeProps {
  fsm: WmsFsm;
  status: string;
  label?: string;
}

export function WmsStatusBadge({ fsm, status, label }: WmsStatusBadgeProps) {
  const statusLower = status?.toLowerCase() ?? '';
  const colorClass =
    FSM_STATUS_COLORS[fsm]?.[statusLower] ?? (statusLower === '' ? DEFAULT_COLOR : YELLOW);
  const text = label ?? STATUS_LABELS[statusLower] ?? status?.replace(/_/g, ' ') ?? '';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {text}
    </span>
  );
}

export default WmsStatusBadge;
