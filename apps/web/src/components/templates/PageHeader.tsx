import React from "react";
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Button,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Skeleton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Plus,
  Download,
  Upload,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

// ============ 类型定义 ============

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface PageAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "contained" | "outlined" | "text";
  color?: "primary" | "secondary" | "success" | "error" | "warning" | "info";
  disabled?: boolean;
  loading?: boolean;
  tooltip?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: PageAction[];
  backButton?: {
    href?: string;
    onClick?: () => void;
  };
  onRefresh?: () => void;
  loading?: boolean;
  children?: React.ReactNode;
}

// ============ 页面头部组件 ============

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  backButton,
  onRefresh,
  loading,
  children,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const renderBreadcrumbs = () => {
    if (!breadcrumbs || breadcrumbs.length === 0) return null;

    return (
      <Breadcrumbs
        separator={<ChevronRight style={{ width: 16, height: 16 }} />}
        sx={{ mb: 2 }}
      >
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;

          if (isLast || !item.href) {
            return (
              <Typography
                key={index}
                color="text.primary"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontSize: "0.875rem",
                }}
              >
                {item.icon}
                {item.label}
              </Typography>
            );
          }

          return (
            <Link
              key={index}
              component={RouterLink}
              to={item.href}
              color="inherit"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                fontSize: "0.875rem",
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    );
  };

  const renderActions = () => {
    if (!actions || actions.length === 0) return null;

    const visibleActions = isMobile ? actions.slice(0, 2) : actions;
    const hiddenActions = isMobile ? actions.slice(2) : [];

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {visibleActions.map((action, index) => {
          const buttonContent = (
            <Button
              key={index}
              variant={action.variant || "outlined"}
              color={action.color || "primary"}
              startIcon={action.icon}
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              href={action.href}
              component={action.href ? RouterLink : "button"}
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
        })}

        {hiddenActions.length > 0 && (
          <Tooltip title="更多操作">
            <IconButton size="small">
              <MoreHorizontal style={{ width: 20, height: 20 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ mb: 3 }}>
      {/* 面包屑导航 */}
      {renderBreadcrumbs()}

      {/* 标题栏 */}
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          flexDirection: { xs: "column", sm: "row" },
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {/* 返回按钮 */}
          {backButton && (
            <Tooltip title="返回">
              <IconButton
                size="small"
                onClick={backButton.onClick}
                component={backButton.href ? RouterLink : "button"}
                to={backButton.href}
              >
                <ArrowLeft style={{ width: 20, height: 20 }} />
              </IconButton>
            </Tooltip>
          )}

          {/* 标题和副标题 */}
          <Box>
            {loading ? (
              <>
                <Skeleton width={200} height={32} />
                {subtitle && <Skeleton width={150} height={20} />}
              </>
            ) : (
              <>
                <Typography
                  variant={isMobile ? "h5" : "h4"}
                  sx={{ fontWeight: 600 }}
                >
                  {title}
                </Typography>
                {subtitle && (
                  <Typography variant="body2" color="text.secondary">
                    {subtitle}
                  </Typography>
                )}
              </>
            )}
          </Box>
        </Box>

        {/* 操作按钮 */}
        {!loading && renderActions()}

        {/* 刷新按钮 */}
        {onRefresh && !loading && (
          <Tooltip title="刷新">
            <IconButton size="small" onClick={onRefresh}>
              <RefreshCw style={{ width: 18, height: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* 额外内容 */}
      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </Box>
  );
};

// ============ 导出 ============

export default PageHeader;
