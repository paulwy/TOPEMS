import React from 'react';

/**
 * 通用状态徽章（Tailwind 体系）——模块业务映射作为数据注入，组件本体唯一实现。
 *
 * 用法：
 *   <StatusBadge status="created" fsm="inbound" fsmColors={FSM_COLORS} labelMap={LABELS} />  // FSM 嵌套映射
 *   <StatusBadge status="draft" colors={FLAT_COLORS} />                                      // 扁平映射
 *
 * 与 @topems/shared-components 的 MUI StatusBadge 并存：本组件为 Tailwind 类体系，
 * 供 wms/tms/aps/qms/mes 等模块徽章收敛使用；MUI 体系页面使用共享包版本。
 */
interface StatusBadgeProps {
  /** 原始状态值（映射键大小写不敏感） */
  status: string;
  /** 显式文案，优先于 labelMap 与状态值美化 */
  label?: string;
  /** 扁平映射：状态 → Tailwind 类 */
  colors?: Record<string, string>;
  /** FSM 维度（fsmColors 为嵌套映射时必传） */
  fsm?: string;
  /** FSM 嵌套映射：维度 → 状态 → Tailwind 类 */
  fsmColors?: Record<string, Record<string, string>>;
  /** 状态 → i18n 文案映射 */
  labelMap?: Record<string, string>;
  /** 覆盖徽章圆角样式（如 'rounded-md'） */
  className?: string;
  /** FSM 模式下未知状态的回退色（默认灰；wms 等模块用黄强调未知状态） */
  fallbackColor?: string;
}

/** 统一状态色板：各模块仅声明状态→颜色映射，不再重复颜色字面量。 */
export const STATUS_PALETTE = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  cyan: 'bg-cyan-100 text-cyan-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  amber: 'bg-amber-100 text-amber-700',
} as const;

const GRAY = STATUS_PALETTE.gray;

export function StatusBadge({
  status,
  label,
  colors,
  fsm,
  fsmColors,
  labelMap,
  className,
  fallbackColor,
}: StatusBadgeProps) {
  const statusLower = status?.toLowerCase() ?? '';
  const colorClass = fsmColors
    ? (fsmColors[fsm!]?.[statusLower] ?? (statusLower === '' ? GRAY : (fallbackColor ?? GRAY)))
    : (colors?.[statusLower] ?? GRAY);
  const text = label ?? labelMap?.[statusLower] ?? status?.replace(/_/g, ' ') ?? '';
  return (
    <span
      className={`inline-flex items-center ${className ?? 'rounded-full'} px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {text}
    </span>
  );
}

export default StatusBadge;

export interface FsmStatusBadgeProps<F extends string> {
  fsm: F;
  status: string;
  label?: string;
}

/**
 * FSM 徽章工厂：aps/qms/tms/wms 等模块只需注入 FSM 颜色映射与文案，
 * 组件渲染与回退逻辑只在 common 实现一次。
 */
export function createFsmStatusBadge<F extends string>(
  fsmColors: Record<F, Record<string, string>>,
  labelMap: Record<string, string>,
  options?: { fallbackColor?: string; className?: string }
) {
  return function FsmStatusBadge({ fsm, status, label }: FsmStatusBadgeProps<F>) {
    return (
      <StatusBadge
        status={status}
        label={label}
        fsm={fsm}
        fsmColors={fsmColors}
        labelMap={labelMap}
        fallbackColor={options?.fallbackColor}
        className={options?.className}
      />
    );
  };
}
