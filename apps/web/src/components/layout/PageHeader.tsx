import React from "react";
import { Box, Typography, IconButton, Tooltip, TextField, InputAdornment, useTheme, useMediaQuery, Link,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Search, Plus, ChevronRight } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";
import { HelpButton } from "../common/HelpButton";

// ============ 类型定义 ============

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface PageHeaderAction {
  /** 按钮标签 */
  label: string;
  /** 按钮图标 */
  icon?: React.ReactNode;
  /** 点击回调 */
  onClick?: () => void;
  /** 跳转链接 */
  href?: string;
  /** 按钮变体 */
  variant?: "contained" | "outlined" | "text";
  /** 按钮颜色 */
  color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否加载中 */
  loading?: boolean;
  /** 提示文字 */
  tooltip?: string;
}

export interface PageHeaderProps {
  /** 页面标题 */
  title: string;
  /** 副标题 */
  subtitle?: string;
  /** 面包屑导航 */
  breadcrumbs?: BreadcrumbItem[];
  /**
   * 自定义图标（仅用于展示，兼容旧 API）
   * @deprecated 该字段当前未在头部渲染，如需图标请使用 actions 中的按钮
   */
  icon?: React.ReactNode;
  /** 返回按钮配置 */
  backButton?: {
    href?: string;
    onClick?: () => void;
    tooltip?: string;
  };
  /**
   * 是否显示返回按钮（兼容旧 API，等价于 backButton）
   * @deprecated 请使用 backButton
   */
  showBack?: boolean;
  /**
   * 返回按钮点击回调（兼容旧 API，等价于 backButton.onClick）
   * @deprecated 请使用 backButton.onClick
   */
  onBack?: () => void;
  /** 搜索框配置 */
  searchBox?: {
    value?: string;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
    placeholder?: string;
  };
  /** 新建按钮配置 */
  createButton?: {
    label?: string;
    onClick?: () => void;
    href?: string;
    disabled?: boolean;
  };
  /** 操作按钮列表（支持配置对象数组或自定义 JSX） */
  actions?: PageHeaderAction[] | React.ReactNode;
  /** 帮助内容 */
  helpContent?: React.ReactNode;
  /** 帮助标题 */
  helpTitle?: string;
  /** 自定义右侧内容 */
  rightContent?: React.ReactNode;
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 自定义样式 */
  sx?: object;
}

// ============ PageHeader 组件 ============

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  icon: _icon,
  backButton: backButtonProp,
  showBack,
  onBack,
  searchBox,
  createButton,
  actions,
  helpContent,
  helpTitle,
  rightContent,
  loading = false,
  sx,
}) => {
  // 兼容旧 API：showBack + onBack → backButton
  const backButton =
    backButtonProp || (showBack ? { onClick: onBack } : undefined);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchBox?.onSearch) {
      searchBox.onSearch((e.target as HTMLInputElement).value);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        gap: 2,
        mb: 3,
        ...sx,
      }}
    >
      {/* 面包屑导航 */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Box sx={{ width: "100%", mb: 1 }}>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span
                key={index}
                style={{ display: "inline-flex", alignItems: "center" }}
              >
                {item.href ? (
                  <Link
                    component={RouterLink}
                    to={item.href}
                    color="text.secondary"
                    sx={{
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                      fontSize: "0.875rem",
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ) : (
                  <Typography
                    variant="body2"
                    color={isLast ? "text.primary" : "text.secondary"}
                  >
                    {item.icon}
                    {item.label}
                  </Typography>
                )}
                {!isLast && (
                  <ChevronRight
                    style={{
                      width: 16,
                      height: 16,
                      color: "#9ca3af",
                      marginLeft: 4,
                      marginRight: 4,
                    }}
                  />
                )}
              </span>
            );
          })}
        </Box>
      )}

      {/* 左侧：返回按钮 + 标题 */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        {/* 返回按钮 */}
        {backButton && (
          <Tooltip title={backButton.tooltip || "返回"}>
            <IconButton
              size="small"
              onClick={backButton.onClick}
              component={backButton.href ? RouterLink : "button"}
              to={backButton.href}
              sx={{
                color: "text.secondary",
                "&:hover": {
                  color: "primary.main",
                  backgroundColor: "action.hover",
                },
              }}
            >
              <ArrowLeft style={{ width: 20, height: 20 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* 标题和副标题 */}
        <Box>
          <Typography
            variant={isMobile ? "h5" : "h4"}
            sx={{ fontWeight: 600, lineHeight: 1.3 }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      {/* 右侧：搜索框 + 操作按钮 + 帮助按钮 */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
        }}
      >
        {/* 搜索框 */}
        {searchBox && (
          <TextField
            size="small"
            placeholder={searchBox.placeholder || "搜索..."}
            value={searchBox.value}
            onChange={(e) => searchBox.onChange?.(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            sx={{
              minWidth: { xs: "100%", sm: 200 },
              maxWidth: { xs: "100%", sm: 300 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
              },
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search style={{ width: 18, height: 18, opacity: 0.5 }} />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}

        {/* 新建按钮 */}
        {createButton && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Plus style={{ width: 18, height: 18 }} />}
            onClick={createButton.onClick}
            component={createButton.href ? RouterLink : "button"}
            to={createButton.href}
            disabled={createButton.disabled}
            size={isMobile ? "small" : "medium"}
          >
            {createButton.label || "新建"}
          </Button>
        )}

        {/* 其他操作按钮 */}
        {Array.isArray(actions)
          ? actions.map((action, index) => {
              const buttonContent = (
                <Button
                  key={index}
                  variant={action.variant || "outlined"}
                  color={action.color || "primary"}
                  startIcon={action.icon}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  component={action.href ? RouterLink : "button"}
                  to={action.href}
                  size={isMobile ? "small" : "medium"}
                >
                  {!isMobile && action.label}
                </Button>
              );

              if (action.tooltip) {
                return (
                  <Tooltip key={index} title={action.tooltip}>
                    <span>{buttonContent}</span>
                  </Tooltip>
                );
              }

              return buttonContent;
            })
          : actions}

        {/* 自定义右侧内容 */}
        {rightContent}

        {/* 帮助按钮 */}
        {helpContent && (
          <HelpButton title={helpTitle} content={helpContent} size="small" />
        )}
      </Box>
    </Box>
  );
};

export default PageHeader;
