/**
 * StatsPageTemplate - 统计图表页面模板
 * 适用于数据统计、仪表盘、分析报表等场景
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Skeleton,
  Tooltip,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Divider,
} from "@mui/material";
import {
  Search,
  RefreshCw,
  Download,
  Filter,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { EmptyState } from "@/components/mui";

/**
 * 统计指标卡片类型
 */
export interface StatCard {
  id: string;
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: "primary" | "success" | "warning" | "error" | "info";
  suffix?: string;
  prefix?: string;
  description?: string;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  gradient?: [string, string];
}

/**
 * 图表数据类型
 */
export interface ChartData {
  name: string;
  value: number;
  color?: string;
  [key: string]: any;
}

/**
 * 图表配置类型
 */
export interface ChartConfig {
  id: string;
  title: string;
  type: "line" | "bar" | "pie" | "donut" | "area" | "radar";
  dataKey: string;
  nameKey: string;
  data: ChartData[];
  height?: number;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
  comparisonData?: ChartData[];
  comparisonLabel?: string;
}

/**
 * 表格列配置类型
 */
export interface TableColumn {
  id: string;
  label: string;
  field?: string;
  render?: (value: any, row: any) => React.ReactNode;
  align?: "left" | "center" | "right";
  width?: number | string;
  sortable?: boolean;
}

/**
 * 数据表格类型
 */
export interface DataTable {
  id: string;
  title?: string;
  columns: TableColumn[];
  data: any[];
  height?: number;
  loading?: boolean;
}

/**
 * 时间范围选项类型
 */
export interface TimeRangeOption {
  label: string;
  value: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * 标签页类型
 */
export interface TabItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

/**
 * StatsPageTemplate属性
 */
export interface StatsPageTemplateProps {
  /** 页面标题 */
  title: string;
  /** 页面副标题 */
  subtitle?: string;
  /** 统计指标卡片 */
  statCards?: StatCard[];
  /** 统计卡片列数 */
  statColumns?: number;
  /** 图表配置列表 */
  charts?: ChartConfig[];
  /** 图表网格列数 */
  chartColumns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  /** 数据表格配置 */
  tables?: DataTable[];
  /** 加载状态 */
  loading?: boolean;
  /** 空状态配置 */
  emptyState?: {
    emoji?: string;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
  };
  /** 时间范围选项 */
  timeRangeOptions?: TimeRangeOption[];
  /** 当前时间范围 */
  timeRange?: string;
  /** 时间范围变更回调 */
  onTimeRangeChange?: (value: string) => void;
  /** 搜索配置 */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** 搜索回调 */
  onSearch?: () => void;
  /** 导出按钮回调 */
  onExport?: () => void;
  /** 导出按钮文本 */
  exportText?: string;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 标签页配置 */
  tabs?: TabItem[];
  /** 当前标签页值 */
  tabValue?: string;
  /** 标签页变更回调 */
  onTabChange?: (value: string) => void;
  /** 是否显示时间范围选择器 */
  showTimeRange?: boolean;
  /** 是否显示搜索 */
  showSearch?: boolean;
  /** 是否显示导出按钮 */
  showExport?: boolean;
  /** 是否显示刷新按钮 */
  showRefresh?: boolean;
  /** 自定义工具栏 */
  customToolbar?: React.ReactNode;
  /** 图表区域标题 */
  chartSectionTitle?: string;
  /** 表格区域标题 */
  tableSectionTitle?: string;
  /** 是否显示图表区域 */
  showCharts?: boolean;
  /** 是否显示表格区域 */
  showTables?: boolean;
  /** 图表最小高度 */
  chartMinHeight?: number;
  /** 是否显示统计卡片网格 */
  showStatCards?: boolean;
  /** 统计卡片排列方向 */
  statCardDirection?: "row" | "column";
}

/**
 * StatsPageTemplate - 统计图表页面模板
 */
export const StatsPageTemplate: React.FC<StatsPageTemplateProps> = ({
  title,
  subtitle,
  statCards = [],
  statColumns = 4,
  charts = [],
  chartColumns = { xs: 1, md: 2 },
  tables = [],
  loading = false,
  emptyState,
  timeRangeOptions = [],
  timeRange,
  onTimeRangeChange,
  search,
  onSearch,
  onExport,
  exportText = "导出",
  onRefresh,
  tabs = [],
  tabValue,
  onTabChange,
  showTimeRange = true,
  showSearch = true,
  showExport = true,
  showRefresh = true,
  customToolbar,
  chartSectionTitle,
  tableSectionTitle,
  showCharts = true,
  showTables = true,
  chartMinHeight = 300,
  showStatCards = true,
  statCardDirection = "row",
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.down("lg"));

  // 内部状态
  const [internalTabValue, setInternalTabValue] = useState<string>("");

  // 使用受控或内部状态
  const activeTabValue = tabValue !== undefined ? tabValue : internalTabValue;
  const setActiveTabValue =
    tabValue !== undefined ? () => {} : setInternalTabValue;

  // 标签页变更
  const handleTabChange = useCallback(
    (_: any, newValue: string) => {
      setActiveTabValue(newValue);
      onTabChange?.(newValue);
    },
    [onTabChange, setActiveTabValue],
  );

  // 渲染统计卡片
  const renderStatCards = () => {
    if (!showStatCards || statCards.length === 0) return null;

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: statCardDirection === "column" ? "column" : "row",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        {statCards.map((stat) => (
          <Paper
            key={stat.id}
            sx={{
              flex: statCardDirection === "row" ? 1 : undefined,
              minWidth: statCardDirection === "row" ? 200 : "100%",
              p: 2.5,
              borderRadius: 2,
              background: stat.gradient
                ? `linear-gradient(135deg, ${stat.gradient[0]}, ${stat.gradient[1]})`
                : undefined,
              bgcolor: stat.gradient ? undefined : "background.paper",
              color: stat.gradient ? "white" : "inherit",
              position: "relative",
              overflow: "hidden",
              transition: "all 0.2s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: 4,
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
              {stat.icon && (
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: stat.gradient
                      ? "rgba(255,255,255,0.2)"
                      : `${stat.color || "primary"}.light`,
                    color: stat.gradient
                      ? "white"
                      : `${stat.color || "primary"}.main`,
                  }}
                >
                  {stat.icon}
                </Box>
              )}
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    opacity: stat.gradient ? 0.8 : 1,
                    color: stat.gradient
                      ? "rgba(255,255,255,0.8)"
                      : "text.secondary",
                  }}
                >
                  {stat.title}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                  {stat.prefix && (
                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 700,
                        color: stat.gradient ? "white" : "text.primary",
                      }}
                    >
                      {stat.prefix}
                    </Typography>
                  )}
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 700,
                      color: stat.gradient ? "white" : "text.primary",
                    }}
                  >
                    {stat.value}
                  </Typography>
                  {stat.suffix && (
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 500,
                        color: stat.gradient
                          ? "rgba(255,255,255,0.8)"
                          : "text.secondary",
                      }}
                    >
                      {stat.suffix}
                    </Typography>
                  )}
                </Box>
                {stat.description && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: stat.gradient
                        ? "rgba(255,255,255,0.7)"
                        : "text.secondary",
                    }}
                  >
                    {stat.description}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* 趋势指示器 */}
            {stat.trend && (
              <Chip
                size="small"
                icon={
                  stat.trend.direction === "up" ? (
                    <TrendingUpIcon />
                  ) : stat.trend.direction === "down" ? (
                    <TrendingDownIcon />
                  ) : undefined
                }
                label={
                  stat.trend.label ||
                  `${stat.trend.value > 0 ? "+" : ""}${stat.trend.value}%`
                }
                sx={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  bgcolor:
                    stat.trend.direction === "up"
                      ? stat.gradient
                        ? "rgba(255,255,255,0.2)"
                        : "success.light"
                      : stat.trend.direction === "down"
                        ? stat.gradient
                          ? "rgba(255,255,255,0.2)"
                          : "error.light"
                        : "grey.200",
                  color: stat.gradient
                    ? "white"
                    : stat.trend.direction === "up"
                      ? "success.main"
                      : stat.trend.direction === "down"
                        ? "error.main"
                        : "text.secondary",
                  fontWeight: 500,
                }}
              />
            )}
          </Paper>
        ))}
      </Box>
    );
  };

  // 渲染图表
  const renderCharts = () => {
    if (!showCharts || charts.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        {chartSectionTitle && (
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            {chartSectionTitle}
          </Typography>
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: `repeat(${chartColumns.sm || 2}, 1fr)`,
              md: `repeat(${chartColumns.md || 2}, 1fr)`,
              lg: `repeat(${chartColumns.lg || 2}, 1fr)`,
            },
            gap: 3,
          }}
        >
          {charts.map((chart) => (
            <Paper
              key={chart.id}
              sx={{
                p: 3,
                borderRadius: 2,
                minHeight: chartMinHeight,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                {chart.title}
              </Typography>

              {/* 图表内容占位 - 实际项目中会接入图表库如Recharts */}
              <Box
                sx={{
                  height: chart.height || 250,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "grey.50",
                  borderRadius: 1,
                }}
              >
                <Typography color="text.secondary">
                  图表: {chart.type} - {chart.data.length} 项数据
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      </Box>
    );
  };

  // 渲染数据表格
  const renderTables = () => {
    if (!showTables || tables.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        {tableSectionTitle && (
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            {tableSectionTitle}
          </Typography>
        )}

        {tables.map((table) => (
          <Paper
            key={table.id}
            sx={{
              p: 3,
              borderRadius: 2,
              mb: 2,
            }}
          >
            {table.title && (
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                {table.title}
              </Typography>
            )}

            <Box sx={{ overflowX: "auto" }}>
              <Box
                component="table"
                sx={{
                  width: "100%",
                  borderCollapse: "collapse",
                  "& th, & td": {
                    p: 1.5,
                    textAlign: "left",
                    borderBottom: 1,
                    borderColor: "divider",
                  },
                  "& th": {
                    fontWeight: 600,
                    bgcolor: "grey.50",
                    color: "text.secondary",
                    fontSize: "0.875rem",
                  },
                  "& td": {
                    fontSize: "0.875rem",
                  },
                }}
              >
                <thead>
                  <tr>
                    {table.columns.map((col) => (
                      <th
                        key={col.id}
                        style={{
                          textAlign: col.align || "left",
                          width: col.width,
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.loading ? (
                    <tr>
                      <td
                        colSpan={table.columns.length}
                        style={{ textAlign: "center", padding: 40 }}
                      >
                        <Typography color="text.secondary">
                          加载中...
                        </Typography>
                      </td>
                    </tr>
                  ) : table.data.length === 0 ? (
                    <tr>
                      <td
                        colSpan={table.columns.length}
                        style={{ textAlign: "center", padding: 40 }}
                      >
                        <Typography color="text.secondary">暂无数据</Typography>
                      </td>
                    </tr>
                  ) : (
                    table.data.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {table.columns.map((col) => (
                          <td
                            key={col.id}
                            style={{ textAlign: col.align || "left" }}
                          >
                            {col.render && col.field
                              ? col.render(row[col.field], row)
                              : col.field ? row[col.field] : ""}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    );
  };

  // 渲染加载状态
  if (loading && statCards.length === 0 && charts.length === 0 && tables.length === 0) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* 页面标题栏 */}
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="text" width={300} height={24} sx={{ mt: 1 }} />
        </Box>

        {/* 统计卡片 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              md: `repeat(${statColumns}, 1fr)`,
            },
            gap: 2,
            mb: 3,
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={120} sx={{ borderRadius: 2 }} />
          ))}
        </Box>

        {/* 图表 */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
            gap: 3,
          }}
        >
          {[1, 2].map((i) => (
            <Skeleton key={i} height={300} sx={{ borderRadius: 2 }} />
          ))}
        </Box>
      </Box>
    );
  }

  // 空状态
  if (!loading && statCards.length === 0 && charts.length === 0 && tables.length === 0) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <EmptyState
          emoji={emptyState?.emoji || "📊"}
          title={emptyState?.title || "暂无数据"}
          description={emptyState?.description}
          actionLabel={emptyState?.actionLabel}
          onAction={emptyState?.onAction}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* 页面标题栏 */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* 操作按钮 */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {showRefresh && onRefresh && (
            <Tooltip title="刷新">
              <IconButton onClick={onRefresh} disabled={loading}>
                <RefreshCw
                  sx={{
                    width: 18,
                    height: 18,
                    animation: loading ? "spin 1s linear infinite" : "none",
                    "@keyframes spin": {
                      "0%": { transform: "rotate(0deg)" },
                      "100%": { transform: "rotate(360deg)" },
                    },
                  }}
                />
              </IconButton>
            </Tooltip>
          )}

          {showExport && onExport && (
            <Button
              variant="outlined"
              startIcon={<Download style={{ width: 16, height: 16 }} />}
              onClick={onExport}
              size="small"
            >
              {exportText}
            </Button>
          )}
        </Box>
      </Box>

      {/* 自定义工具栏 */}
      {customToolbar && <Box sx={{ mb: 2 }}>{customToolbar}</Box>}

      {/* 标签页 */}
      {tabs.length > 0 && (
        <Paper sx={{ mb: 3, borderRadius: 2 }}>
          <Tabs
            value={activeTabValue}
            onChange={handleTabChange}
            sx={{
              borderBottom: 1,
              borderColor: "divider",
              px: 2,
            }}
          >
            {tabs.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={tab.icon as React.ReactElement<unknown> | undefined}
                disabled={tab.disabled}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Paper>
      )}

      {/* 筛选工具栏 */}
      <Paper sx={{ mb: 3, p: 2, borderRadius: 2 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* 搜索框 */}
          {showSearch && search && (
            <TextField
              size="small"
              placeholder={search.placeholder || "搜索..."}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch?.()}
              sx={{ minWidth: 250 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search
                        sx={{ width: 18, height: 18, color: "text.secondary" }}
                      />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}

          {/* 时间范围选择 */}
          {showTimeRange && timeRangeOptions.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={timeRange || timeRangeOptions[0]?.value}
                onChange={(e) => onTimeRangeChange?.(e.target.value)}
                startAdornment={
                  <InputAdornment position="start">
                    <Calendar
                      sx={{
                        width: 16,
                        height: 16,
                        color: "text.secondary",
                        mr: 0.5,
                      }}
                    />
                  </InputAdornment>
                }
              >
                {timeRangeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* 搜索按钮 */}
          {showSearch && onSearch && (
            <Button variant="contained" size="small" onClick={onSearch}>
              搜索
            </Button>
          )}
        </Box>
      </Paper>

      {/* 统计卡片 */}
      {renderStatCards()}

      {/* 图表 */}
      {renderCharts()}

      {/* 数据表格 */}
      {renderTables()}
    </Box>
  );
};

// 趋势图标组件
const TrendingUpIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M2 9L5 5L7 7L10 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 3H10V5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrendingDownIcon: React.FC = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path
      d="M2 3L5 7L7 5L10 9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 9H10V7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default StatsPageTemplate;
