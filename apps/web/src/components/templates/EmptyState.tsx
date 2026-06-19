import React from "react";
import type { BoxProps } from "@mui/material";
import { Box, Typography, Button, Stack } from "@mui/material";
import {
  FileX,
  Inbox,
  Search,
  Filter,
  FolderOpen,
  Database,
  AlertCircle,
  Plus,
} from "lucide-react";

// ============ 类型定义 ============

/**
 * 空状态类型
 */
export type EmptyStateType =
  | "default"
  | "no-data"
  | "no-results"
  | "search-empty"
  | "filter-empty"
  | "folder-empty"
  | "database-empty"
  | "error"
  | "custom";

/**
 * 空状态操作按钮接口
 */
export interface EmptyStateAction {
  /** 按钮文本 */
  label: string;
  /** 点击回调 */
  onClick?: () => void;
  /** 按钮变体 */
  variant?: "contained" | "outlined" | "text";
  /** 按钮颜色 */
  color?: "primary" | "secondary" | "error" | "warning" | "success" | "info";
  /** 图标 */
  icon?: React.ReactNode;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 空状态组件属性
 */
export interface EmptyStateProps extends Omit<BoxProps, "children"> {
  /** 空状态类型 */
  type?: EmptyStateType;
  /** 主标题 */
  title?: string;
  /** 描述文本 */
  description?: string;
  /** 自定义图标 */
  icon?: React.ReactNode;
  /** 操作按钮列表 */
  actions?: EmptyStateAction[];
  /** 自定义内容（当type为custom时使用） */
  children?: React.ReactNode;
  /** 图标尺寸 */
  iconSize?: number;
  /** 是否居中显示 */
  centered?: boolean;
}

// ============ 默认配置 ============

/**
 * 根据空状态类型获取默认配置
 */
const getDefaultConfig = (type: EmptyStateType, title?: string) => {
  const configs: Record<
    EmptyStateType,
    { icon: React.ReactNode; defaultTitle: string; defaultDescription: string }
  > = {
    default: {
      icon: <Inbox size={64} />,
      defaultTitle: title || "暂无数据",
      defaultDescription: "当前没有内容，请稍后再试",
    },
    "no-data": {
      icon: <FileX size={64} />,
      defaultTitle: title || "暂无数据",
      defaultDescription: "还没有添加任何数据",
    },
    "no-results": {
      icon: <Search size={64} />,
      defaultTitle: title || "没有找到结果",
      defaultDescription: "请尝试修改搜索条件",
    },
    "search-empty": {
      icon: <Search size={64} />,
      defaultTitle: title || "搜索结果为空",
      defaultDescription: "没有找到匹配的搜索结果",
    },
    "filter-empty": {
      icon: <Filter size={64} />,
      defaultTitle: title || "筛选结果为空",
      defaultDescription: "没有符合筛选条件的数据",
    },
    "folder-empty": {
      icon: <FolderOpen size={64} />,
      defaultTitle: title || "文件夹为空",
      defaultDescription: "此文件夹中没有任何文件",
    },
    "database-empty": {
      icon: <Database size={64} />,
      defaultTitle: title || "数据库为空",
      defaultDescription: "还没有任何记录",
    },
    error: {
      icon: <AlertCircle size={64} />,
      defaultTitle: title || "出错了",
      defaultDescription: "发生了错误，请稍后重试",
    },
    custom: {
      icon: <Inbox size={64} />,
      defaultTitle: title || "",
      defaultDescription: "",
    },
  };

  return configs[type];
};

// ============ 空状态组件 ============

/**
 * 空状态组件
 * 用于显示列表、搜索、筛选等场景的空状态提示
 *
 * @example
 * ```tsx
 * // 默认空状态
 * <EmptyState />
 *
 * // 搜索结果为空
 * <EmptyState type="search-empty" title="没有找到用户" />
 *
 * // 带操作按钮
 * <EmptyState
 *   type="no-data"
 *   description="还没有创建任何项目"
 *   actions={[
 *     { label: "创建项目", onClick: handleCreate, variant: "contained" },
 *   ]}
 * />
 *
 * // 自定义图标和内容
 * <EmptyState type="custom" icon={<MyIcon />}>
 *   <div>自定义内容</div>
 * </EmptyState>
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type = "default",
  title,
  description,
  icon,
  actions,
  children,
  iconSize = 64,
  centered = true,
  sx,
  ...props
}) => {
  const config = getDefaultConfig(type, title);

  return (
    <Box
      sx={{
        display: centered ? "flex" : "block",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: centered ? "center" : "left",
        py: centered ? 8 : 0,
        px: 3,
        ...sx,
      }}
      {...props}
    >
      {/* 图标 */}
      <Box
        sx={{
          color: "text.disabled",
          mb: 3,
          opacity: 0.6,
        }}
      >
        {icon || config.icon}
      </Box>

      {/* 自定义内容 */}
      {children ? (
        children
      ) : (
        <>
          {/* 标题 */}
          <Typography
            variant="h6"
            color="text.primary"
            sx={{ mb: 1, fontWeight: 600 }}
          >
            {title || config.defaultTitle}
          </Typography>

          {/* 描述 */}
          {description || config.defaultDescription ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: actions?.length ? 3 : 0, maxWidth: 400 }}
            >
              {description || config.defaultDescription}
            </Typography>
          ) : null}

          {/* 操作按钮 */}
          {actions && actions.length > 0 && (
            <Stack
              direction="row"
              spacing={1}
              sx={{ justifyContent: centered ? "center" : "flex-start" }}
            >
              {actions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant || "contained"}
                  color={action.color || "primary"}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  startIcon={
                    action.icon ? (
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {action.icon}
                      </Box>
                    ) : index === 0 && type === "no-data" ? (
                      <Plus size={16} />
                    ) : undefined
                  }
                >
                  {action.label}
                </Button>
              ))}
            </Stack>
          )}
        </>
      )}
    </Box>
  );
};

// ============ 预设空状态组件 ============

/**
 * 无数据空状态
 */
export const NoDataEmptyState: React.FC<Omit<EmptyStateProps, "type">> = (
  props,
) => <EmptyState type="no-data" {...props} />;

/**
 * 搜索结果为空
 */
export const SearchEmptyState: React.FC<Omit<EmptyStateProps, "type">> = (
  props,
) => <EmptyState type="search-empty" {...props} />;

/**
 * 筛选结果为空
 */
export const FilterEmptyState: React.FC<Omit<EmptyStateProps, "type">> = (
  props,
) => <EmptyState type="filter-empty" {...props} />;

/**
 * 文件夹为空
 */
export const FolderEmptyState: React.FC<Omit<EmptyStateProps, "type">> = (
  props,
) => <EmptyState type="folder-empty" {...props} />;

/**
 * 错误状态
 */
export const ErrorEmptyState: React.FC<Omit<EmptyStateProps, "type">> = (
  props,
) => <EmptyState type="error" {...props} />;

export default EmptyState;
