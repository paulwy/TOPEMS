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
import { usePerformanceMonitor } from "../hooks/usePerformanceMonitor";
import { useAppStore } from "../store";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModeToggle } from "@/components/ModeToggle";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
          <div className="text-sm text-gray-900 dark:text-gray-100">
            {new Date(row.original.timestamp).toLocaleTimeString()}
          </div>
        ),
      },
      {
        accessorKey: "endpoint",
        header: "API 端点",
        cell: ({ row }) => (
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
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
            <span className={`text-sm font-medium ${colorClass}`}>
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
            <Badge
              variant={
                row.original.status === "success" ? "secondary" : "destructive"
              }
            >
              {row.original.status === "success" ? "成功" : "失败"}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                性能监控
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                实时监控系统性能指标
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <ModeToggle />
            <Button onClick={handleExport}>
              <Download className="w-5 h-5 mr-2" />
              导出报告
            </Button>
            <Button variant="destructive" onClick={handleClear}>
              <Trash2 className="w-5 h-5 mr-2" />
              清除数据
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  页面加载时间
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {(metrics.pageLoadTime / 1000).toFixed(2)}s
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  metrics.pageLoadTime < 2000
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-yellow-100 dark:bg-yellow-900/30"
                }`}
              >
                <Clock
                  className={`w-6 h-6 ${
                    metrics.pageLoadTime < 2000
                      ? "text-green-600 dark:text-green-400"
                      : "text-yellow-600 dark:text-yellow-400"
                  }`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  API 平均响应
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {avgResponseTime.toFixed(0)}ms
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  avgResponseTime < 500
                    ? "bg-green-100 dark:bg-green-900/30"
                    : avgResponseTime < 1000
                      ? "bg-yellow-100 dark:bg-yellow-900/30"
                      : "bg-red-100 dark:bg-red-900/30"
                }`}
              >
                <TrendingUp
                  className={`w-6 h-6 ${
                    avgResponseTime < 500
                      ? "text-green-600 dark:text-green-400"
                      : avgResponseTime < 1000
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-red-600 dark:text-red-400"
                  }`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  API 成功率
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {successRate.toFixed(1)}%
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  successRate >= 95
                    ? "bg-green-100 dark:bg-green-900/30"
                    : successRate >= 80
                      ? "bg-yellow-100 dark:bg-yellow-900/30"
                      : "bg-red-100 dark:bg-red-900/30"
                }`}
              >
                {successRate >= 95 ? (
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle
                    className={`w-6 h-6 ${
                      successRate >= 80
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  慢 API 调用
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {slowCalls.length}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  slowCalls.length === 0
                    ? "bg-green-100 dark:bg-green-900/30"
                    : "bg-yellow-100 dark:bg-yellow-900/30"
                }`}
              >
                <AlertTriangle
                  className={`w-6 h-6 ${
                    slowCalls.length === 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-yellow-600 dark:text-yellow-400"
                  }`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Page Performance */}
        <Card>
          <CardHeader>
            <CardTitle>页面性能指标</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  首次绘制 (FP)
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {metrics.firstPaint.toFixed(0)}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  首次内容绘制 (FCP)
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {metrics.firstContentfulPaint.toFixed(0)}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  DOM 内容加载
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {metrics.domContentLoaded.toFixed(0)}ms
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  页面完全加载
                </span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {metrics.pageLoadTime.toFixed(0)}ms
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Slow API Calls */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>慢 API 调用</CardTitle>
              <div className="flex items-center space-x-2">
                <Label
                  htmlFor="slowThreshold"
                  className="text-sm text-gray-500 dark:text-gray-400"
                >
                  阈值:
                </Label>
                <Input
                  id="slowThreshold"
                  type="number"
                  value={slowCallThreshold}
                  onChange={(e) => setSlowCallThreshold(Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ms
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {slowCalls.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-600 dark:text-green-400" />
                <p>没有慢 API 调用</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {slowCalls.map((call, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {call.endpoint}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(call.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-600 dark:text-red-400">
                        {(call.duration / 1000).toFixed(2)}s
                      </div>
                      <div
                        className={`text-xs ${
                          call.status === "success"
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {call.status === "success" ? "成功" : "失败"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* API Call History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>API 调用历史</CardTitle>
            <div className="flex items-center space-x-2">
              <Switch
                id="autoRefresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <Label
                htmlFor="autoRefresh"
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                自动刷新
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {apiHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              暂无 API 调用记录
            </div>
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
    </div>
  );
};

export default PerformanceMonitorPage;
