import { Card, CardContent, Typography, Box, Stack, FormControl, InputLabel, Select, MenuItem,  } from "@mui/material";
import { Button } from "@/components/ui/Button";
import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Activity,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  GitBranch,
  AlertCircle,
} from "lucide-react";
import { flowApi } from "@/api/flow";
import { useAppStore } from "../../store";
import { apiLogger } from "@/utils/logger";

interface Statistics {
  total_workflows: number;
  active_workflows: number;
  total_instances: number;
  running_instances: number;
  completed_instances: number;
  rejected_instances: number;
  total_approvals: number;
  pending_approvals: number;
  approved_approvals: number;
  rejected_approvals: number;
  avg_approval_time: number;
  approval_rate: number;
  rejection_rate: number;
  workflow_stats: WorkflowStat[];
  monthly_data: MonthlyData[];
}

interface WorkflowStat {
  workflow_id: string;
  workflow_name: string;
  instance_count: number;
  completion_rate: number;
  avg_duration: number;
}

interface MonthlyData {
  month: string;
  instances_started: number;
  instances_completed: number;
  approvals_processed: number;
}

const FlowStatisticsPage: React.FC = () => {
  const addNotification = useAppStore((state) => state.addNotification);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");

  useEffect(() => {
    loadStatistics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      const response = await flowApi.getStatistics();
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        addNotification({
          title: "错误",
          message: response.message || "加载统计数据失败",
          type: "error",
        });
      }
    } catch (err) {
      apiLogger.error("加载统计数据失败:", err);
      addNotification({
        title: "错误",
        message: "加载统计数据失败",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return (((current - previous) / previous) * 100).toFixed(1);
  };

  const maxMonthlyInstances =
    stats?.monthly_data.reduce(
      (max, m) => Math.max(max, m.instances_started),
      0,
    ) || 1;
  const maxMonthlyApprovals =
    stats?.monthly_data.reduce(
      (max, m) => Math.max(max, m.approvals_processed),
      0,
    ) || 1;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.50", p: 3 }}>
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: "secondary.light",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BarChart3 size={24} style={{ color: "#7c3aed" }} />
              </Box>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  统计分析报表
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  工作流数据统计和分析
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>时间范围</InputLabel>
                <Select
                  value={timeRange}
                  label="时间范围"
                  onChange={(e) => setTimeRange(e.target.value)}
                >
                  <MenuItem value="week">本周</MenuItem>
                  <MenuItem value="month">本月</MenuItem>
                  <MenuItem value="quarter">本季度</MenuItem>
                  <MenuItem value="year">本年</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                onClick={loadStatistics}
                startIcon={
                  loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )
                }
              >
                刷新数据
              </Button>
              <Button
                variant="contained"
                sx={{ bgcolor: "secondary.main" }}
                startIcon={<Download size={16} />}
              >
                导出报表
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 3,
          mb: 3,
        }}
      >
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  工作流数量
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: "baseline" }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats?.total_workflows || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({stats?.active_workflows || 0} 活跃)
                  </Typography>
                </Stack>
              </Box>
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
                <GitBranch size={24} style={{ color: "#6366f1" }} />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  实例总数
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats?.total_instances || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats?.running_instances || 0} 进行中 ·{" "}
                  {stats?.completed_instances || 0} 已完成
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: "success.light",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Activity size={24} style={{ color: "#16a34a" }} />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  审批总数
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats?.total_approvals || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats?.pending_approvals || 0} 待处理 ·{" "}
                  {stats?.approved_approvals || 0} 已通过
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: "info.light",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={24} style={{ color: "#2563eb" }} />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <Box>
                <Typography variant="body2" color="text.secondary">
                  平均审批时长
                </Typography>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: "baseline" }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats?.avg_approval_time || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    小时
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  通过率 {stats?.approval_rate || 0}% · 拒绝率{" "}
                  {stats?.rejection_rate || 0}%
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: "warning.light",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Clock size={24} style={{ color: "#ca8a04" }} />
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 3,
          mb: 3,
        }}
      >
        <Box sx={{ gridColumn: "span 2" }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 3,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  月度趋势
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center" }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      启动实例
                    </Typography>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center" }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: "success.main",
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      完成实例
                    </Typography>
                  </Stack>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center" }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: "secondary.main",
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      审批处理
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>

              <Box
                sx={{
                  height: 256,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-around",
                }}
              >
                {stats?.monthly_data.map((month, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-end",
                        height: 192,
                        gap: 0.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 32,
                          bgcolor: "primary.main",
                          borderRadius: "4px 4px 0 0",
                          height: `${(month.instances_started / maxMonthlyInstances) * 100}%`,
                          transition: "all 0.3s",
                          "&:hover": { bgcolor: "primary.dark" },
                        }}
                      />
                      <Box
                        sx={{
                          width: 32,
                          bgcolor: "success.main",
                          borderRadius: "4px 4px 0 0",
                          height: `${(month.instances_completed / maxMonthlyInstances) * 100}%`,
                          transition: "all 0.3s",
                          "&:hover": { bgcolor: "success.dark" },
                        }}
                      />
                      <Box
                        sx={{
                          width: 32,
                          bgcolor: "secondary.main",
                          borderRadius: "4px 4px 0 0",
                          height: `${(month.approvals_processed / maxMonthlyApprovals) * 100}%`,
                          transition: "all 0.3s",
                          "&:hover": { bgcolor: "secondary.dark" },
                        }}
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1 }}
                    >
                      {month.month}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              实例状态分布
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Box sx={{ position: "relative", width: 192, height: 192 }}>
                <Box
                  component="svg"
                  viewBox="0 0 100 100"
                  sx={{
                    transform: "rotate(-90deg)",
                    position: "absolute",
                    top: 0,
                    left: 0,
                  }}
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="12"
                    strokeDasharray={`${((stats?.running_instances || 0) / (stats?.total_instances || 1)) * 251.2} 251.2`}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${((stats?.completed_instances || 0) / (stats?.total_instances || 1)) * 251.2} 251.2`}
                    strokeDashoffset={
                      -(
                        (stats?.running_instances || 0) /
                        (stats?.total_instances || 1)
                      ) * 251.2
                    }
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="12"
                    strokeDasharray={`${((stats?.rejected_instances || 0) / (stats?.total_instances || 1)) * 251.2} 251.2`}
                    strokeDashoffset={
                      -(
                        ((stats?.running_instances || 0) +
                          (stats?.completed_instances || 0)) /
                        (stats?.total_instances || 1)
                      ) * 251.2
                    }
                  />
                </Box>
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats?.total_instances || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    总计
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={1} sx={{ width: "100%", mt: 2 }}>
                <Stack
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center" }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      进行中
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {stats?.running_instances || 0} (
                    {(
                      ((stats?.running_instances || 0) /
                        (stats?.total_instances || 1)) *
                      100
                    ).toFixed(1)}
                    %)
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center" }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: "success.main",
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      已完成
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {stats?.completed_instances || 0} (
                    {(
                      ((stats?.completed_instances || 0) /
                        (stats?.total_instances || 1)) *
                      100
                    ).toFixed(1)}
                    %)
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center" }}
                  >
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        bgcolor: "error.main",
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      已拒绝
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {stats?.rejected_instances || 0} (
                    {(
                      ((stats?.rejected_instances || 0) /
                        (stats?.total_instances || 1)) *
                      100
                    ).toFixed(1)}
                    %)
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            工作流性能排行
          </Typography>

          <Box sx={{ overflowX: "auto" }}>
            <Box component="table" sx={{ width: "100%" }}>
              <Box component="thead">
                <Box
                  component="tr"
                  sx={{ borderBottom: 1, borderColor: "divider" }}
                >
                  <Box component="th" sx={{ textAlign: "left", py: 2, px: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      工作流名称
                    </Typography>
                  </Box>
                  <Box
                    component="th"
                    sx={{ textAlign: "center", py: 2, px: 2 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      实例数
                    </Typography>
                  </Box>
                  <Box
                    component="th"
                    sx={{ textAlign: "center", py: 2, px: 2 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      完成率
                    </Typography>
                  </Box>
                  <Box
                    component="th"
                    sx={{ textAlign: "center", py: 2, px: 2 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      平均时长
                    </Typography>
                  </Box>
                  <Box
                    component="th"
                    sx={{ textAlign: "center", py: 2, px: 2 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      状态
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box component="tbody">
                {stats?.workflow_stats.map((stat, index) => (
                  <Box
                    component="tr"
                    key={stat.workflow_id}
                    sx={{
                      borderBottom: 1,
                      borderColor: "divider",
                      "&:hover": { bgcolor: "grey.50" },
                    }}
                  >
                    <Box component="td" sx={{ py: 2, px: 2 }}>
                      <Stack
                        direction="row"
                        spacing={1.5}
                        sx={{ alignItems: "center" }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            bgcolor: "grey.100",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {index + 1}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {stat.workflow_name}
                        </Typography>
                      </Stack>
                    </Box>
                    <Box
                      component="td"
                      sx={{ py: 2, px: 2, textAlign: "center" }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {stat.instance_count}
                      </Typography>
                    </Box>
                    <Box component="td" sx={{ py: 2, px: 2 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: "center", justifyContent: "center" }}
                      >
                        <Box
                          sx={{
                            width: 128,
                            height: 8,
                            bgcolor: "grey.200",
                            borderRadius: 1,
                            overflow: "hidden",
                          }}
                        >
                          <Box
                            sx={{
                              width: `${stat.completion_rate}%`,
                              height: "100%",
                              bgcolor:
                                stat.completion_rate >= 90
                                  ? "success.main"
                                  : stat.completion_rate >= 70
                                    ? "warning.main"
                                    : "error.main",
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 500,
                            color:
                              stat.completion_rate >= 90
                                ? "success.main"
                                : stat.completion_rate >= 70
                                  ? "warning.main"
                                  : "error.main",
                          }}
                        >
                          {stat.completion_rate}%
                        </Typography>
                      </Stack>
                    </Box>
                    <Box
                      component="td"
                      sx={{ py: 2, px: 2, textAlign: "center" }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {stat.avg_duration}h
                      </Typography>
                    </Box>
                    <Box
                      component="td"
                      sx={{ py: 2, px: 2, textAlign: "center" }}
                    >
                      <Box
                        component="span"
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: 12,
                          bgcolor:
                            stat.completion_rate >= 90
                              ? "success.light"
                              : stat.completion_rate >= 70
                                ? "warning.light"
                                : "error.light",
                          color:
                            stat.completion_rate >= 90
                              ? "success.dark"
                              : stat.completion_rate >= 70
                                ? "warning.dark"
                                : "error.dark",
                        }}
                      >
                        {stat.completion_rate >= 90
                          ? "优秀"
                          : stat.completion_rate >= 70
                            ? "良好"
                            : "需优化"}
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box
        sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 3 }}
      >
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              审批效率指标
            </Typography>
            <Stack spacing={2}>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <CheckCircle size={20} style={{ color: "#16a34a" }} />
                  <Typography variant="body2" color="text.secondary">
                    审批通过率
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: "center" }}
                >
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "success.main" }}
                  >
                    {stats?.approval_rate || 0}%
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center", color: "success.main" }}
                  >
                    <ArrowUpRight size={12} />
                    <Typography variant="caption">+2.5%</Typography>
                  </Stack>
                </Stack>
              </Stack>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <XCircle size={20} style={{ color: "#dc2626" }} />
                  <Typography variant="body2" color="text.secondary">
                    审批拒绝率
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: "center" }}
                >
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "error.main" }}
                  >
                    {stats?.rejection_rate || 0}%
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center", color: "error.main" }}
                  >
                    <ArrowDownRight size={12} />
                    <Typography variant="caption">-1.2%</Typography>
                  </Stack>
                </Stack>
              </Stack>
              <Stack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <Clock size={20} style={{ color: "#2563eb" }} />
                  <Typography variant="body2" color="text.secondary">
                    平均审批时长
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: "center" }}
                >
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "primary.main" }}
                  >
                    {stats?.avg_approval_time || 0}h
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ alignItems: "center", color: "success.main" }}
                  >
                    <ArrowDownRight size={12} />
                    <Typography variant="caption">-0.5h</Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              待处理审批
            </Typography>
            {stats?.pending_approvals && stats.pending_approvals > 0 ? (
              <Stack spacing={1.5}>
                {[1, 2, 3].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 2,
                      bgcolor: "grey.50",
                      borderRadius: 1,
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={1.5}
                      sx={{ alignItems: "center" }}
                    >
                      <AlertCircle size={20} style={{ color: "#ca8a04" }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          采购审批#{i * 100 + 12}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          等待审批 · 2小时前
                        </Typography>
                      </Box>
                    </Stack>
                    <Box
                      component="span"
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: 12,
                        bgcolor: "warning.light",
                        color: "warning.dark",
                      }}
                    >
                      待处理
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CheckCircle
                  size={48}
                  style={{
                    color: "#d1d5db",
                    margin: "0 auto",
                    marginBottom: 8,
                  }}
                />
                <Typography color="text.secondary">暂无待处理审批</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default FlowStatisticsPage;
