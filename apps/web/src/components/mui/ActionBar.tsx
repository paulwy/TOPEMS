import React from "react";
import {
  Box,
  Paper,
  Button,
  IconButton,
  Tooltip,
  Typography,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  RefreshCw,
  Download,
  Upload,
  Plus,
  MoreHorizontal,
} from "lucide-react";

// ============ 类型定义 ============

export interface Action {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "contained" | "outlined" | "text";
  color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
  dividerBefore?: boolean;
}

export interface ActionBarProps {
  // 主要操作
  primaryAction?: Action;

  // 次要操作
  secondaryActions?: Action[];

  // 更多操作
  moreActions?: Action[];

  // 标题
  title?: string;
  subtitle?: string;

  // 状态
  loading?: boolean;

  // 自定义
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;

  // 布局
  density?: "compact" | "standard";
}

// ============ ActionBar 组件 ============

export const ActionBar: React.FC<ActionBarProps> = ({
  primaryAction,
  secondaryActions = [],
  moreActions = [],
  title,
  subtitle,
  loading,
  leftContent,
  rightContent,
  density = "standard",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  // 可见的次要操作数量
  const visibleSecondaryCount = isMobile ? 0 : isTablet ? 2 : 3;
  const hiddenSecondaryActions = secondaryActions.slice(visibleSecondaryCount);
  const visibleSecondaryActions = secondaryActions.slice(
    0,
    visibleSecondaryCount,
  );

  // 是否显示更多菜单
  const hasMoreActions =
    moreActions.length > 0 || hiddenSecondaryActions.length > 0;
  const allMoreActions = [...hiddenSecondaryActions, ...moreActions];

  return (
    <Paper
      sx={{
        p: density === "compact" ? 1.5 : 2,
        borderRadius: 2,
        mb: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {/* 左侧内容 */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* 标题 */}
          {(title || subtitle) && (
            <Box sx={{ minWidth: 0 }}>
              {title && (
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {title}
                </Typography>
              )}
              {subtitle && (
                <Typography variant="caption" color="text.secondary">
                  {subtitle}
                </Typography>
              )}
            </Box>
          )}

          {/* 自定义左侧内容 */}
          {leftContent}
        </Box>

        {/* 操作按钮 */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}
        >
          {/* 自定义右侧内容 */}
          {rightContent}

          {/* 次要操作 */}
          {visibleSecondaryActions.map((action, index) => (
            <React.Fragment key={index}>
              {action.dividerBefore && (
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              )}
              {renderActionButton(
                action,
                density === "compact" ? "small" : "medium",
              )}
            </React.Fragment>
          ))}

          {/* 主要操作 */}
          {primaryAction && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              {renderActionButton(
                {
                  ...primaryAction,
                  variant: primaryAction.variant || "contained",
                },
                density === "compact" ? "small" : "medium",
              )}
            </>
          )}

          {/* 更多按钮 */}
          {hasMoreActions && (
            <IconButton size="small">
              <MoreHorizontal style={{ width: 18, height: 18 }} />
            </IconButton>
          )}
        </Box>
      </Box>
    </Paper>
  );
};

// ============ 辅助函数 ============

function renderActionButton(
  action: Action,
  size: "small" | "medium" = "medium",
) {
  const {
    label,
    icon,
    onClick,
    disabled,
    loading,
    tooltip,
    variant = "outlined",
    color = "primary",
  } = action;

  const button = (
    <Button
      variant={variant}
      color={color}
      size={size}
      onClick={onClick}
      disabled={disabled || loading}
      startIcon={loading ? undefined : icon}
      sx={{ whiteSpace: "nowrap" }}
    >
      {loading ? "处理中..." : label}
    </Button>
  );

  if (tooltip) {
    return (
      <Tooltip key={label} title={tooltip}>
        {button}
      </Tooltip>
    );
  }

  return button;
}

// ============ 快捷操作栏 ============

export interface QuickActionBarProps {
  actions: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick?: () => void;
    color?: string;
  }>;
  loading?: boolean;
}

export const QuickActionBar: React.FC<QuickActionBarProps> = ({
  actions,
  loading,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        flexWrap: "wrap",
      }}
    >
      {actions.map((action, index) => (
        <Button
          key={index}
          size="small"
          variant="outlined"
          onClick={action.onClick}
          startIcon={action.icon}
          disabled={loading}
          sx={{
            borderColor: action.color || "primary.main",
            color: action.color || "primary.main",
            "&:hover": {
              borderColor: action.color || "primary.dark",
              bgcolor: `${action.color || "primary"}.light`,
            },
          }}
        >
          {action.label}
        </Button>
      ))}
    </Box>
  );
};

export default ActionBar;
