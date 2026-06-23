import React, { useState } from "react";
import {
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  MoreVertical,
  Download,
  Maximize2,
  RefreshCw,
  Calendar,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Card, CardHeader, CardContent, Menu, MenuItem, Skeleton, Typography, Chip,  } from "@mui/material";
import { Button } from "@/components/ui/Button";

type ChartType = "bar" | "line" | "area" | "pie";

interface TimeRange {
  label: string;
  value: string;
}

const timeRanges: TimeRange[] = [
  { label: "今日", value: "today" },
  { label: "本周", value: "week" },
  { label: "本月", value: "month" },
  { label: "本季度", value: "quarter" },
  { label: "本年", value: "year" },
];

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: number;
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onExport?: () => void;
  onFullscreen?: () => void;
  chartTypes?: ChartType[];
  activeChartType?: ChartType;
  onChartTypeChange?: (_type: ChartType) => void;
  timeRange?: string;
  onTimeRangeChange?: (_range: string) => void;
  showTimeRange?: boolean;
  showChartType?: boolean;
  showExport?: boolean;
  showFullscreen?: boolean;
  showRefresh?: boolean;
  className?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
}

const ChartCardIcon: Record<ChartType, React.ReactNode> = {
  bar: <BarChart3 style={{ width: 16, height: 16 }} />,
  line: <LineChart style={{ width: 16, height: 16 }} />,
  area: <AreaChart style={{ width: 16, height: 16 }} />,
  pie: <PieChart style={{ width: 16, height: 16 }} />,
};

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  height = 320,
  loading = false,
  error,
  onRefresh,
  onExport,
  onFullscreen,
  chartTypes = ["bar", "line", "area", "pie"],
  activeChartType = "bar",
  onChartTypeChange,
  timeRange = "month",
  onTimeRangeChange,
  showTimeRange = false,
  showChartType = false,
  showExport = true,
  showFullscreen = true,
  showRefresh = true,
  className = "",
  trend,
  trendValue,
}) => {
  const [timeMenuAnchor, setTimeMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(
    null,
  );

  const getTrendIcon = () => {
    if (!trend || trend === "stable") return null;
    return trend === "up" ? (
      <TrendingUp style={{ width: 16, height: 16, color: "#10B981" }} />
    ) : (
      <TrendingUp
        style={{
          width: 16,
          height: 16,
          color: "#EF4444",
          transform: "rotate(180deg)",
        }}
      />
    );
  };

  const getTrendColor = () => {
    if (!trend || trend === "stable") return "text.secondary";
    return trend === "up" ? "#10B981" : "#EF4444";
  };

  return (
    <Card
      sx={{
        overflow: "hidden",
        transition: "all 0.3s",
        "&:hover": { boxShadow: 2 },
      }}
      className={className}
    >
      <CardHeader
        sx={{
          padding: "16px 24px",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
        }}
        action={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {showChartType && chartTypes.length > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#F1F5F9",
                  borderRadius: 8,
                  padding: 2,
                }}
              >
                {chartTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => onChartTypeChange?.(type)}
                    style={{
                      padding: 6,
                      borderRadius: 6,
                      border: "none",
                      backgroundColor:
                        activeChartType === type ? "white" : "transparent",
                      color:
                        activeChartType === type ? "#1D4ED8" : "text.secondary",
                      cursor: "pointer",
                      boxShadow:
                        activeChartType === type
                          ? "0 1px 2px rgba(0,0,0,0.1)"
                          : "none",
                    }}
                    title={type}
                  >
                    {ChartCardIcon[type]}
                  </button>
                ))}
              </div>
            )}

            {showTimeRange && (
              <Button
                variant="text"
                size="small"
                onClick={(e) => setTimeMenuAnchor(e.currentTarget)}
                sx={{ textTransform: "none", padding: "6px 12px" }}
              >
                <Calendar style={{ width: 16, height: 16, marginRight: 4 }} />
                <span>
                  {timeRanges.find((r) => r.value === timeRange)?.label ||
                    "本月"}
                </span>
              </Button>
            )}

            <Button
              variant="text"
              size="small"
              onClick={(e) => setActionMenuAnchor(e.currentTarget)}
            >
              <MoreVertical style={{ width: 16, height: 16 }} />
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Typography variant="h6" sx={{ fontWeight: "semibold" }}>
            {title}
          </Typography>
          {trend && trendValue && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                color: getTrendColor(),
              }}
            >
              {getTrendIcon()}
              <span style={{ fontSize: 12, fontWeight: 500 }}>
                {trendValue}
              </span>
            </div>
          )}
        </div>
        {subtitle && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ marginTop: 2 }}
          >
            {subtitle}
          </Typography>
        )}
      </CardHeader>

      <CardContent sx={{ padding: 24 }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Skeleton sx={{ width: "33%", height: 16 }} />
            <Skeleton sx={{ width: "100%", height: 200, borderRadius: 8 }} />
          </div>
        ) : error ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 32,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                backgroundColor: "#FEF2F2",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <AlertCircle
                style={{ width: 24, height: 24, color: "#EF4444" }}
              />
            </div>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ marginBottom: 8 }}
            >
              {error}
            </Typography>
            {onRefresh && (
              <Button variant="outlined" size="small" onClick={onRefresh}>
                <RefreshCw style={{ width: 16, height: 16, marginRight: 4 }} />
                重试
              </Button>
            )}
          </div>
        ) : (
          <div style={{ height }}>{children}</div>
        )}
      </CardContent>

      <Menu
        anchorEl={timeMenuAnchor}
        open={Boolean(timeMenuAnchor)}
        onClose={() => setTimeMenuAnchor(null)}
      >
        {timeRanges.map((range) => (
          <MenuItem
            key={range.value}
            onClick={() => {
              onTimeRangeChange?.(range.value);
              setTimeMenuAnchor(null);
            }}
            selected={timeRange === range.value}
          >
            {range.label}
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={() => setActionMenuAnchor(null)}
      >
        {showRefresh && (
          <MenuItem
            onClick={() => {
              onRefresh?.();
              setActionMenuAnchor(null);
            }}
          >
            <RefreshCw style={{ width: 16, height: 16, marginRight: 8 }} />
            刷新数据
          </MenuItem>
        )}
        {showExport && (
          <MenuItem
            onClick={() => {
              onExport?.();
              setActionMenuAnchor(null);
            }}
          >
            <Download style={{ width: 16, height: 16, marginRight: 8 }} />
            导出数据
          </MenuItem>
        )}
        {showFullscreen && (
          <MenuItem
            onClick={() => {
              onFullscreen?.();
              setActionMenuAnchor(null);
            }}
          >
            <Maximize2 style={{ width: 16, height: 16, marginRight: 8 }} />
            全屏查看
          </MenuItem>
        )}
      </Menu>
    </Card>
  );
};
