/**
 * FlowStatisticsPage 重构版本
 *
 * 重构要点：
 * 1. 使用 PageHeader 统一页面头部
 * 2. 保持统计图表布局
 * 3. Flow 主题色使用紫色 (#8b5cf6)
 */

import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
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
import { PageHeader } from "../../components/layout";
import { useAppStore } from "../../store";

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

// 模拟统计数据
const mockStats: Statistics = {
  total_workflows: 12,
  active_workflows: 8,
  total_instances: 156,
  running_instances: 23,
  completed_instances: 128,
  rejected_instances: 5,
  total_approvals: 89,
  pending_approvals: 12,
  approved_approvals: 72,
  rejected_approvals: 5,
  avg_approval_time: 4.5,
  approval_rate: 80.9,
  rejection_rate: 5.6,
  workflow_stats: [
    { workflow_id: "1", workflow_name: "采购审批流程", instance_count: 45, completion_rate: 95, avg_duration: 2.5 },
    { workflow_id: "2", workflow_name: "请假审批流程", instance_count: 38, completion_rate: 92, avg_duration: 1.2 },
    { workflow_id: "3", workflow_name: "合同审批流程", instance_count: 28, completion_rate: 88, avg_duration: 6.8 },
    { workflow_id: "4", workflow_name: "费用报销流程", instance_count: 25, completion_rate: 85, avg_duration: 3.2 },
  ],
  monthly_data: [
    { month: "1月", instances_started: 12, instances_completed: 10, approvals_processed: 8 },
    { month: "2月", instances_started: 15, instances_completed: 14, approvals_processed: 12 },
    { month: "3月", instances_started: 18, instances_completed: 16, approvals_processed: 14 },
    { month: "4月", instances_started: 20, instances_completed: 18, approvals_processed: 15 },
    { month: "5月", instances_started: 22, instances_completed: 20, approvals_processed: 18 },
    { month: "6月", instances_started: 25, instances_completed: 22, approvals_processed: 20 },
  ],
};

const FlowStatisticsPageRefactored: React.FC = () => {
  const navigate = useNavigate();
  const addNotification = useAppStore((state) => state.addNotification);
  const [stats, setStats] = useState<Statistics | null>(mockStats);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("month");

  const loadStatistics = useCallback(async () => {
    setLoading(true);
    // 实际项目中这里会调用 API
    setTimeout(() => {
      setStats(mockStats);
      setLoading(false);
    }, 500);
  }, []);

  const handleExport = useCallback(() => {
    addNotification({
      title: "提示",
      message: "导出功能开发中",
      type: "info",
    });
  }, [addNotification]);

  if (!stats) return null;

  const maxMonthlyInstances = Math.max(...stats.monthly_data.map((m) => m.instances_started), 1);
  const maxMonthlyApprovals = Math.max(...stats.monthly_data.map((m) => m.approvals_processed), 1);

  return (
    <>
      <PageHeader
        title="统计分析报表"
        subtitle="工作流数据统计和分析"
        rightContent={
          <Stack direction="row" spacing={1}>
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
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
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
              onClick={handleExport}
            >
              导出报表
            </Button>
          </Stack>
        }
      />

      {/* 统计卡片 */}
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
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  工作流数量
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "baseline" }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.total_workflows}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ({stats.active_workflows} 活跃)
                  </Typography>
                </Stack>
              </Box>
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
                <GitBranch size={24} style={{ color: "#8b5cf6" }} />
              </Box>
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent sx={{ p: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  实例总数
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats.total_instances}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.running_instances} 进行中 · {stats.completed_instances} 已完成
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
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  审批总数
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats.total_approvals}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stats.pending_approvals} 待处理 · {stats.approved_approvals} 已通过
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
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  平均审批时长
                </Typography>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "baseline" }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {stats.avg_approval_time}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    小时
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  通过率 {stats.approval_rate}% · 拒绝率 {stats.rejection_rate}%
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

      {/* 图表区域 */}
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
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                月度趋势
              </Typography>
              <Box
                sx={{
                  height: 256,
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-around",
                }}
              >
                {stats.monthly_data.map((month, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "flex-end", height: 192, gap: 0.5 }}>
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
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
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
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
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
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="12" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="12"
                    strokeDasharray={`${((stats.running_instances) / (stats.total_instances || 1)) * 251.2} 251.2`}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${((stats.completed_instances) / (stats.total_instances || 1)) * 251.2} 251.2`}
                    strokeDashoffset={-((stats.running_instances) / (stats.total_instances || 1)) * 251.2}
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="12"
                    strokeDasharray={`${((stats.rejected_instances) / (stats.total_instances || 1)) * 251.2} 251.2`}
                    strokeDashoffset={-(((stats.running_instances) + (stats.completed_instances)) / (stats.total_instances || 1)) * 251.2}
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
                    {stats.total_instances}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    总计
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={1} sx={{ width: "100%", mt: 2 }}>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "primary.main" }} />
                    <Typography variant="body2" color="text.secondary">进行中</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {stats.running_instances} ({((stats.running_instances / (stats.total_instances || 1)) * 100).toFixed(1)}%)
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "success.main" }} />
                    <Typography variant="body2" color="text.secondary">已完成</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {stats.completed_instances} ({((stats.completed_instances / (stats.total_instances || 1)) * 100).toFixed(1)}%)
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                    <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "error.main" }} />
                    <Typography variant="body2" color="text.secondary">已拒绝</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {stats.rejected_instances} ({((stats.rejected_instances / (stats.total_instances || 1)) * 100).toFixed(1)}%)
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* 工作流性能排行 */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
            工作流性能排行
          </Typography>
          <Box sx={{ overflowX: "auto" }}>
            <Box component="table" sx={{ width: "100%" }}>
              <Box component="thead">
                <Box component="tr" sx={{ borderBottom: 1, borderColor: "divider" }}>
                  <Box component="th" sx={{ textAlign: "left", py: 2, px: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>工作流名称</Typography>
                  </Box>
                  <Box component="th" sx={{ textAlign: "center", py: 2, px: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>实例数</Typography>
                  </Box>
                  <Box component="th" sx={{ textAlign: "center", py: 2, px: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>完成率</Typography>
                  </Box>
                  <Box component="th" sx={{ textAlign: "center", py: 2, px: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>平均时长</Typography>
                  </Box>
                  <Box component="th" sx={{ textAlign: "center", py: 2, px: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>状态</Typography>
                  </Box>
                </Box>
              </Box>
              <Box component="tbody">
                {stats.workflow_stats.map((stat, index) => (
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
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            bgcolor: "secondary.light",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 500, color: "secondary.main" }}>
                            {index + 1}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {stat.workflow_name}
                        </Typography>
                      </Stack>
                    </Box>
                    <Box component="td" sx={{ py: 2, px: 2, textAlign: "center" }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {stat.instance_count}
                      </Typography>
                    </Box>
                    <Box component="td" sx={{ py: 2, px: 2 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "center" }}>
                        <Box sx={{ width: 128, height: 8, bgcolor: "grey.200", borderRadius: 1, overflow: "hidden" }}>
                          <Box
                            sx={{
                              width: `${stat.completion_rate}%`,
                              height: "100%",
                              bgcolor: stat.completion_rate >= 90 ? "success.main" : stat.completion_rate >= 70 ? "warning.main" : "error.main",
                              borderRadius: 1,
                            }}
                          />
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 500,
                            color: stat.completion_rate >= 90 ? "success.main" : stat.completion_rate >= 70 ? "warning.main" : "error.main",
                          }}
                        >
                          {stat.completion_rate}%
                        </Typography>
                      </Stack>
                    </Box>
                    <Box component="td" sx={{ py: 2, px: 2, textAlign: "center" }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {stat.avg_duration}h
                      </Typography>
                    </Box>
                    <Box component="td" sx={{ py: 2, px: 2, textAlign: "center" }}>
                      <Chip
                        label={stat.completion_rate >= 90 ? "优秀" : stat.completion_rate >= 70 ? "良好" : "需优化"}
                        size="small"
                        sx={{
                          bgcolor: stat.completion_rate >= 90 ? "success.light" : stat.completion_rate >= 70 ? "warning.light" : "error.light",
                          color: stat.completion_rate >= 90 ? "success.dark" : stat.completion_rate >= 70 ? "warning.dark" : "error.dark",
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* 审批效率指标和待处理审批 */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 3 }}>
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              审批效率指标
            </Typography>
            <Stack spacing={2}>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <CheckCircle size={20} style={{ color: "#16a34a" }} />
                  <Typography variant="body2" color="text.secondary">审批通过率</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "success.main" }}>
                    {stats.approval_rate}%
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "success.main" }}>
                    <ArrowUpRight size={12} />
                    <Typography variant="caption">+2.5%</Typography>
                  </Stack>
                </Stack>
              </Stack>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <XCircle size={20} style={{ color: "#dc2626" }} />
                  <Typography variant="body2" color="text.secondary">审批拒绝率</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "error.main" }}>
                    {stats.rejection_rate}%
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "error.main" }}>
                    <ArrowDownRight size={12} />
                    <Typography variant="caption">-1.2%</Typography>
                  </Stack>
                </Stack>
              </Stack>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                  <Clock size={20} style={{ color: "#2563eb" }} />
                  <Typography variant="body2" color="text.secondary">平均审批时长</Typography>
                </Stack>
                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
                    {stats.avg_approval_time}h
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", color: "success.main" }}>
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
            {stats.pending_approvals > 0 ? (
              <Stack spacing={1.5}>
                {stats.workflow_stats.slice(0, 3).map((stat, i) => (
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
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <AlertCircle size={20} style={{ color: "#ca8a04" }} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {stat.workflow_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          等待审批 · 2小时前
                        </Typography>
                      </Box>
                    </Stack>
                    <Chip label="待处理" size="small" sx={{ bgcolor: "warning.light", color: "warning.dark" }} />
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <CheckCircle size={48} style={{ color: "#d1d5db", margin: "0 auto", marginBottom: 8 }} />
                <Typography color="text.secondary">暂无待处理审批</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </>
  );
};

export default FlowStatisticsPageRefactored;
