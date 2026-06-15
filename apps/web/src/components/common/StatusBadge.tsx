import React from "react";
import { Chip } from "@mui/material";

// 默认状态配置
const DEFAULT_STATUS_MAP: Record<
  string,
  { label: string; color: "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info" }
> = {
  active: { label: "启用", color: "success" },
  inactive: { label: "禁用", color: "default" },
  pending: { label: "待处理", color: "warning" },
  approved: { label: "已批准", color: "success" },
  rejected: { label: "已拒绝", color: "error" },
  draft: { label: "草稿", color: "default" },
  published: { label: "已发布", color: "primary" },
  archived: { label: "已归档", color: "default" },
};

export interface StatusBadgeProps {
  /** 状态值 */
  status: string;
  /** 状态映射配置，默认提供常用状态 */
  statusMap?: Record<
    string,
    { label: string; color: "default" | "primary" | "secondary" | "success" | "warning" | "error" | "info" }
  >;
  /** 显示标签，为空时使用 statusMap 中的 label */
  label?: string;
  /** 是否使用 Chip 组件渲染 */
  useChip?: boolean;
  /** Chip 尺寸 */
  size?: "small" | "medium";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  statusMap = DEFAULT_STATUS_MAP,
  label,
  useChip = true,
  size = "small",
}) => {
  const config = statusMap[status] || { label: label || status, color: "default" as const };

  if (useChip) {
    return (
      <Chip
        label={label || config.label}
        color={config.color}
        size={size}
        sx={{ fontWeight: 500, fontSize: "0.75rem" }}
      />
    );
  }

  return <span>{label || config.label}</span>;
};

export default StatusBadge;
