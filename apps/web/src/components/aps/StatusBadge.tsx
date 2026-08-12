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

export type ApsFsmType =
  | 'production_plan'
  | 'schedule'
  | 'capacity'
  | 'material_plan'
  | 'forecast';

const GRAY = 'bg-gray-100 text-gray-700';
const BLUE = 'bg-blue-100 text-blue-700';
const ORANGE = 'bg-orange-100 text-orange-700';
const GREEN = 'bg-green-100 text-green-700';
const RED = 'bg-red-100 text-red-700';
const PURPLE = 'bg-purple-100 text-purple-700';
const DEFAULT_COLOR = GRAY;

// 每个 FSM 的状态 → 颜色映射
const FSM_STATUS_COLORS: Record<ApsFsmType, Record<string, string>> = {
  production_plan: {
    draft: GRAY,
    pending_approval: ORANGE,
    approved: BLUE,
    in_progress: BLUE,
    completed: GREEN,
    cancelled: RED,
  },
  schedule: {
    pending: GRAY,
    released: BLUE,
    running: BLUE,
    completed: GREEN,
    cancelled: RED,
  },
  capacity: {
    available: GRAY,
    allocated: ORANGE,
    consumed: GREEN,
    maintenance: PURPLE,
    released: BLUE,
  },
  material_plan: {
    pending: GRAY,
    requisitioned: ORANGE,
    sourced: BLUE,
    satisfied: GREEN,
    shortage: RED,
    cancelled: RED,
  },
  forecast: {
    draft: GRAY,
    calculated: BLUE,
    validated: ORANGE,
    adopted: GREEN,
    superseded: PURPLE,
    cancelled: RED,
  },
};

// 状态中文标签映射（跨 FSM 通用，状态值相同时取同一标签）
const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  pending_approval: '待审批',
  approved: '已审批',
  in_progress: '进行中',
  completed: '已完成',
  cancelled: '已取消',
  pending: '待处理',
  released: '已发布',
  running: '运行中',
  available: '可用',
  allocated: '已分配',
  consumed: '已消耗',
  maintenance: '维护中',
  requisitioned: '已请购',
  sourced: '已采购',
  satisfied: '已满足',
  shortage: '短缺',
  calculated: '已计算',
  validated: '已验证',
  adopted: '已采纳',
  superseded: '已替代',
};

interface StatusBadgeProps {
  /** FSM 类型 */
  fsm: ApsFsmType;
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
