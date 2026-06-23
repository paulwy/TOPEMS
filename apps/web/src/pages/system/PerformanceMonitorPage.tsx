import { Card, CardContent, CardHeader, Chip, Typography, Box, TextField, Switch,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Download,
  Trash2,
  ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePerformanceMonitor } from "@/hooks/usePerformanceMonitor";
import { useAppStore } from "../../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";

import { ModeToggle } from "@/components/ModeToggle";

const PerformanceMonitorPage: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const {
    metrics,
    getApiCallHistory,
    getAverageApiResponseTime,
    getApiSuccessRate,
    getSlowApiCalls,
    exportReport,
    clear,
  } = usePerformanceMonitor();

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [slowCallThreshold, setSlowCallThreshold] = useState(1000);
  const [_trigger, _setTrigger] = useState(0);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // 触发重新渲染以更新数据
      _setTrigger((prev) => prev + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const slowCalls = getSlowApiCalls(slowCallThreshold);
  const successRate = getApiSuccessRate();
  const avgResponseTime = getAverageApiResponseTime();
  const apiHistory = getApiCallHistory();

  const handleExport = () => {
    const report = exportReport();
    const blob = new Blob([report], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addNotification({
      title: "成功",
      message: "性能报告已导出",
      type: "success",
    });
  };

  const handleClear = () => {
    clear();
    addNotification({
      title: "成功",
      message: "性能数据已清除",
      type: "success",
    });
  };

  const columns = useMemo<ColumnDef<ReturnType<typeof getApiCallHistory>[0]>[]>(
    () => [
      {
        accessorKey: "timestamp",
        header: "时间",
        cell: ({ row }) => (
          <div style={{ fontSize: 14, color: "#111827" }}>
            {new Date(row.original.timestamp).toLocaleTimeString()}
          </div>
        ),
      },
      {
        accessorKey: "endpoint",
        header: "API 端点",
        cell: ({ row }) => (
          <div style={{ fontSize: 14, fontWeight: 500, color: "#111827" }}>
            {row.original.endpoint}
          </div>
        ),
      },
      {
        accessorKey: "duration",
        header: "响应时间",
        cell: ({ row }) => {
          const duration = row.original.duration;
          let colorClass = "text-green-600";
          if (duration >= 1000) colorClass = "text-red-600";
          else if (duration >= 500) colorClass = "text-yellow-600";

          return (
            <span style={{ fontSize: 14, fontWeight: 500 }}>
              {duration.toFixed(0)}ms
            </span>
          );
        },
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => {
          return (
            <Chip
              size="small"
              variant={
                row.original.status === "success" ? "filled" : "outlined"
              }
              label={row.original.status === "success" ? "成功" : "失败"}
            />
          );
        },
      },
    ],
    [],
  );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", p: 3 }}>
      {/* Header */}
      <Card sx={{ mb: 3, p: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Button variant="text" onClick={() => navigate("/dashboard")}>
              <ChevronLeft sx={{ width: 20, height: 20 }} />
            </Button>
            <Box
              sx={{
                width: 48,
                height: 48,
                bgcolor: "primary.light",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Activity style={{ width: 24, height: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                性能监控
              </Typography>
              <Typography variant="body2" color="text.secondary">
                实时监控系统性能指标
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <ModeToggle />
            <Button variant="outlined" onClick={handleExport}>
              <Download sx={{ width: 20, height: 20, marginRight: 8 }} />
              导出报告
            </Button>
            <Button variant="contained" onClick={handleClear}>
              <Trash2 sx={{ width: 20, height: 20, marginRight: 8 }} />
              清除数据
            </Button>
          </Box>
        </Box>
      </Card>

      {/* Summary Cards */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "1fr 1fr",
            lg: "1fr 1fr 1fr 1fr",
          },
          gap: 3,
          mb: 3,
        }}
      >
        <Card sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                页面加载时间
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                {(metrics.pageLoadTime / 1000).toFixed(2)}s
              </Typography>
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor:
                  metrics.pageLoadTime < 2000
                    ? "success.light"
                    : "warning.light",
              }}
            >
              <Clock
                style={{
                  width: 24,
                  height: 24,
                  color:
                    metrics.pageLoadTime < 2000
                      ? "var(--mui-palette-success-main)"
                      : "var(--mui-palette-warning-main)",
                }}
              />
            </Box>
          </Box>
        </Card>

        <Card sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                API 平均响应
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                {avgResponseTime.toFixed(0)}ms
              </Typography>
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor:
                  avgResponseTime < 500
                    ? "success.light"
                    : avgResponseTime < 1000
                      ? "warning.light"
                      : "error.light",
              }}
            >
              <TrendingUp
                style={{
                  width: 24,
                  height: 24,
                  color:
                    avgResponseTime < 500
                      ? "var(--mui-palette-success-main)"
                      : avgResponseTime < 1000
                        ? "var(--mui-palette-warning-main)"
                        : "var(--mui-palette-error-main)",
                }}
              />
            </Box>
          </Box>
        </Card>

        <Card sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                API 成功率
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                {successRate.toFixed(1)}%
              </Typography>
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor:
                  successRate >= 95
                    ? "success.light"
                    : successRate >= 80
                      ? "warning.light"
                      : "error.light",
              }}
            >
              {successRate >= 95 ? (
                <CheckCircle
                  style={{
                    width: 24,
                    height: 24,
                    color: "var(--mui-palette-success-main)",
                  }}
                />
              ) : (
                <XCircle
                  style={{
                    width: 24,
                    height: 24,
                    color:
                      successRate >= 80
                        ? "var(--mui-palette-warning-main)"
                        : "var(--mui-palette-error-main)",
                  }}
                />
              )}
            </Box>
          </Box>
        </Card>

        <Card sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="body2" color="text.secondary">
                慢 API 调用
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: "bold" }}>
                {slowCalls.length}
              </Typography>
            </Box>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor:
                  slowCalls.length === 0 ? "success.light" : "warning.light",
              }}
            >
              <AlertTriangle
                style={{
                  width: 24,
                  height: 24,
                  color:
                    slowCalls.length === 0
                      ? "var(--mui-palette-success-main)"
                      : "var(--mui-palette-warning-main)",
                }}
              />
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Performance Details */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 3,
          mb: 3,
        }}
      >
        {/* Page Performance */}
        <Card>
          <CardHeader>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              页面性能指标
            </Typography>
          </CardHeader>
          <CardContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  首次绘制 (FP)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {metrics.firstPaint.toFixed(0)}ms
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  首次内容绘制 (FCP)
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {metrics.firstContentfulPaint.toFixed(0)}ms
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  DOM 内容加载
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {metrics.domContentLoaded.toFixed(0)}ms
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  页面完全加载
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {metrics.pageLoadTime.toFixed(0)}ms
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Slow API Calls */}
        <Card>
          <CardHeader>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                慢 API 调用
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  阈值:
                </Typography>
                <TextField
                  id="slowThreshold"
                  type="number"
                  value={slowCallThreshold}
                  onChange={(e) => setSlowCallThreshold(Number(e.target.value))}
                  size="small"
                  sx={{ width: 80 }}
                />
                <Typography variant="body2" color="text.secondary">
                  ms
                </Typography>
              </Box>
            </Box>
          </CardHeader>
          <CardContent>
            {slowCalls.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CheckCircle
                  style={{
                    width: 48,
                    height: 48,
                    color: "var(--mui-palette-success-main)",
                    marginBottom: 8,
                  }}
                />
                <Typography color="text.secondary">没有慢 API 调用</Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  maxHeight: 256,
                  overflow: "auto",
                }}
              >
                {slowCalls.map((call, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      p: 2,
                      bgcolor: "warning.light",
                      borderRadius: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {call.endpoint}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(call.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 500, color: "error.main" }}
                      >
                        {(call.duration / 1000).toFixed(2)}s
                      </Typography>
                      <Typography
                        variant="caption"
                        color={
                          call.status === "success"
                            ? "success.main"
                            : "error.main"
                        }
                      >
                        {call.status === "success" ? "成功" : "失败"}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* API Call History */}
      <Card>
        <CardHeader>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              API 调用历史
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch
                id="autoRefresh"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              <Typography variant="body2" color="text.secondary">
                自动刷新
              </Typography>
            </Box>
          </Box>
        </CardHeader>
        <CardContent sx={{ p: 0 }}>
          {apiHistory.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <Typography color="text.secondary">暂无 API 调用记录</Typography>
            </Box>
          ) : (
            <DataTable
              columns={columns}
              data={apiHistory.slice(-20).reverse()}
              searchKey="endpoint"
              searchPlaceholder="搜索 API 端点..."
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PerformanceMonitorPage;
