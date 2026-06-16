import React from "react";
import type { BoxProps } from "@mui/material";
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Skeleton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { BreadcrumbItem } from "./PageHeader";
import { PageHeader } from "./PageHeader";

// ============ 类型定义 ============

export interface StatCard {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: "primary" | "secondary" | "success" | "warning" | "error" | "info";
  onClick?: () => void;
}

export interface ChartCard {
  id: string;
  title: string;
  subtitle?: string;
  chart: React.ReactNode;
  height?: number;
  actions?: React.ReactNode;
}

export interface RecentItem {
  id: string;
  title: string;
  description?: string;
  time?: string;
  avatar?: React.ReactNode;
  onClick?: () => void;
}

export interface QuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  color?: string;
}

export interface DashboardTemplateProps extends BoxProps {
  // 页面信息
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];

  // 统计卡片
  stats?: StatCard[];

  // 图表
  charts?: ChartCard[];

  // 最近事项
  recentItems?: RecentItem[];
  recentTitle?: string;

  // 快捷操作
  quickActions?: QuickAction[];
  quickActionsTitle?: string;

  // 状态
  loading?: boolean;

  // 子组件
  headerContent?: React.ReactNode;
  children?: React.ReactNode;
}

// ============ 统计卡片组件 ============

const StatCardComponent: React.FC<StatCard & { loading?: boolean }> = ({
  title,
  value,
  unit,
  change,
  changeLabel,
  icon,
  color = "primary",
  onClick,
  loading,
}) => {
  const colorMap: Record<string, string> = {
    primary: "#3b82f6",
    secondary: "#8b5cf6",
    success: "#22c55e",
    warning: "#f59e0b",
    error: "#ef4444",
    info: "#06b6d4",
  };

  const bgColor = colorMap[color] || colorMap.primary;

  return (
    <Card
      sx={{
        borderRadius: 2,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": onClick
          ? {
              transform: "translateY(-2px)",
              boxShadow: 4,
            }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {title}
            </Typography>
            {loading ? (
              <>
                <Skeleton width={80} height={32} />
                <Skeleton width={60} height={20} />
              </>
            ) : (
              <>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {value}
                  {unit && (
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                      sx={{ ml: 0.5 }}
                    >
                      {unit}
                    </Typography>
                  )}
                </Typography>
                {change !== undefined && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      mt: 0.5,
                    }}
                  >
                    {change > 0 ? (
                      <TrendingUp
                        style={{ width: 14, height: 14, color: "#22c55e" }}
                      />
                    ) : change < 0 ? (
                      <TrendingDown
                        style={{ width: 14, height: 14, color: "#ef4444" }}
                      />
                    ) : (
                      <Minus
                        style={{ width: 14, height: 14, color: "#9ca3af" }}
                      />
                    )}
                    <Typography
                      variant="caption"
                      sx={{
                        color:
                          change > 0
                            ? "success.main"
                            : change < 0
                              ? "error.main"
                              : "text.secondary",
                      }}
                    >
                      {change > 0 ? "+" : ""}
                      {change}
                      {changeLabel && ` ${changeLabel}`}
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
          {icon && (
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: `${bgColor}15`,
                color: bgColor,
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// ============ 仪表盘模板组件 ============

export const DashboardTemplate: React.FC<DashboardTemplateProps> = ({
  title,
  subtitle,
  breadcrumbs,
  stats,
  charts,
  recentItems,
  recentTitle = "最近事项",
  quickActions,
  quickActionsTitle = "快捷操作",
  loading,
  headerContent,
  children,
  ...props
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // 渲染统计卡片
  const renderStats = () => {
    if (!stats || stats.length === 0) return null;

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((stat) => (
          <Grid key={stat.id} size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCardComponent {...stat} loading={loading} />
          </Grid>
        ))}
      </Grid>
    );
  };

  // 渲染图表
  const renderCharts = () => {
    if (!charts || charts.length === 0) return null;

    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {charts.map((chart) => (
          <Grid key={chart.id} size={{ xs: 12, md: charts.length === 1 ? 12 : 6 }}>
            <Paper sx={{ borderRadius: 2, height: chart.height || 400 }}>
              <Box
                sx={{
                  p: 2,
                  borderBottom: 1,
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {chart.title}
                  </Typography>
                  {chart.subtitle && (
                    <Typography variant="caption" color="text.secondary">
                      {chart.subtitle}
                    </Typography>
                  )}
                </Box>
                {chart.actions}
              </Box>
              <Box
                sx={{ p: 2, height: chart.height ? chart.height - 80 : 320 }}
              >
                {loading ? (
                  <Skeleton variant="rectangular" width="100%" height="100%" />
                ) : (
                  chart.chart
                )}
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    );
  };

  // 渲染最近事项
  const renderRecentItems = () => {
    if (!recentItems || recentItems.length === 0) return null;

    return (
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {recentTitle}
          </Typography>
        </Box>
        <Box sx={{ p: 0 }}>
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
                <Box
                  key={index}
                  sx={{
                    p: 2,
                    borderBottom: index < 4 ? 1 : 0,
                    borderColor: "divider",
                  }}
                >
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="40%" />
                </Box>
              ))
            : recentItems.map((item, index) => (
                <Box
                  key={item.id}
                  sx={{
                    p: 2,
                    borderBottom: index < recentItems.length - 1 ? 1 : 0,
                    borderColor: "divider",
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    cursor: item.onClick ? "pointer" : "default",
                    "&:hover": item.onClick
                      ? {
                          bgcolor: "action.hover",
                        }
                      : {},
                  }}
                  onClick={item.onClick}
                >
                  {item.avatar && (
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "grey.100",
                      }}
                    >
                      {item.avatar}
                    </Box>
                  )}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </Typography>
                    {item.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          display: "block",
                        }}
                      >
                        {item.description}
                      </Typography>
                    )}
                  </Box>
                  {item.time && (
                    <Typography variant="caption" color="text.secondary">
                      {item.time}
                    </Typography>
                  )}
                </Box>
              ))}
        </Box>
      </Paper>
    );
  };

  // 渲染快捷操作
  const renderQuickActions = () => {
    if (!quickActions || quickActions.length === 0) return null;

    return (
      <Paper sx={{ borderRadius: 2 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {quickActionsTitle}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 2,
            display: "grid",
            gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`,
            gap: 2,
          }}
        >
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rectangular"
                  height={80}
                  sx={{ borderRadius: 1 }}
                />
              ))
            : quickActions.map((action) => (
                <Box
                  key={action.id}
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      borderColor: "primary.main",
                      bgcolor: "primary.light",
                    },
                  }}
                  onClick={action.onClick}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "primary.light",
                      color: "primary.main",
                    }}
                  >
                    {action.icon}
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                    {action.label}
                  </Typography>
                </Box>
              ))}
        </Box>
      </Paper>
    );
  };

  return (
    <Box {...props}>
      {/* 页面头部 */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        loading={loading}
      >
        {headerContent}
      </PageHeader>

      {/* 统计卡片 */}
      {renderStats()}

      {/* 图表 */}
      {renderCharts()}

      {/* 最近事项和快捷操作 */}
      {(recentItems || quickActions) && (
        <Grid container spacing={2}>
          {recentItems && (
            <Grid size={{ xs: 12, md: quickActions ? 8 : 12 }}>
              {renderRecentItems()}
            </Grid>
          )}
          {quickActions && (
            <Grid size={{ xs: 12, md: recentItems ? 4 : 12 }}>
              {renderQuickActions()}
            </Grid>
          )}
        </Grid>
      )}

      {/* 子组件 */}
      {children}
    </Box>
  );
};

export default DashboardTemplate;
