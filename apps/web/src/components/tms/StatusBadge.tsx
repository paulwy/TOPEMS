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

export type TmsFsmType =
  | 'vehicle'
  | 'driver'
  | 'carrier'
  | 'route'
  | 'shipment';

const GRAY = 'bg-gray-100 text-gray-700';
const BLUE = 'bg-blue-100 text-blue-700';
const ORANGE = 'bg-orange-100 text-orange-700';
const GREEN = 'bg-green-100 text-green-700';
const RED = 'bg-red-100 text-red-700';
const DEFAULT_COLOR = GRAY;

// 每个 FSM 的状态 → 颜色映射
const FSM_STATUS_COLORS: Record<TmsFsmType, Record<string, string>> = {
  vehicle: {
    active: GRAY,
    maintenance: BLUE,
    inactive: ORANGE,
    retired: GREEN,
  },
  driver: {
    active: GRAY,
    on_leave: BLUE,
    suspended: ORANGE,
    inactive: RED,
  },
  carrier: {
    pending_review: GRAY,
    active: BLUE,
    suspended: ORANGE,
    blacklisted: RED,
    rejected: RED,
  },
  route: {
    planning: GRAY,
    active: BLUE,
    closed: ORANGE,
    deprecated: GREEN,
    cancelled: RED,
  },
  shipment: {
    draft: GRAY,
    pending: BLUE,
    in_transit: BLUE,
    delivered: GREEN,
    cancelled: RED,
  },
};

// 状态中文标签映射
const STATUS_LABELS: Record<string, string> = {
  active: '运行中',
  maintenance: '维护中',
  inactive: '停用',
  retired: '已退役',
  on_leave: '休假中',
  suspended: '已暂停',
  pending_review: '待审核',
  blacklisted: '已拉黑',
  rejected: '已拒绝',
  planning: '规划中',
  closed: '已关闭',
  deprecated: '已废弃',
  cancelled: '已取消',
  draft: '草稿',
  pending: '待发车',
  in_transit: '运输中',
  delivered: '已送达',
};

interface StatusBadgeProps {
  /** FSM 类型 */
  fsm: TmsFsmType;
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
