import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  Alert,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { PageContainer } from '@/components/common/PageContainerV2';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import {
  Brain,
  Play,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  Gauge,
  Zap,
  RefreshCw,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import type {
  ApsScheduleResult,
  ApsScheduleItem,
  OptimizationReport,
  BottleneckAnalysis,
  ConstraintCheckResult,
} from '@/api/mes';
import { apsApi } from '@/api/mes';

const riskColorMap: Record<string, string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336',
  critical: '#9c27b0',
};

const riskLabelMap: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  critical: '严重',
};

const ApsSchedulingPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState(0);
  const [strategy, setStrategy] = useState<'forward' | 'backward' | 'bidirectional' | 'bottleneck_driven'>('forward');
  const [scheduleResult, setScheduleResult] = useState<ApsScheduleResult | null>(null);
  const [selectedItem, setSelectedItem] = useState<ApsScheduleItem | null>(null);

  const scheduleMutation = useMutation({
    mutationFn: apsApi.schedule,
    onSuccess: (res) => {
      if (res.success && res.data) {
        setScheduleResult(res.data);
        addNotification({
          type: 'success',
          title: '排程完成',
          message: `APS排程完成：${res.data.scheduled_orders}/${res.data.total_orders} 订单已排程`,
        });
      } else {
        addNotification({
          type: 'error',
          title: '排程失败',
          message: res.message || '排程失败',
        });
      }
    },
    onError: (err: Error) =>
      addNotification({
        type: 'error',
        title: '排程失败',
        message: err.message,
      }),
  });

  const { data: optimizationReport, isLoading: reportLoading } = useQuery({
    queryKey: ['aps', 'optimization-report'],
    queryFn: apsApi.getOptimizationReport,
    staleTime: 5 * 60 * 1000,
  });

  const { data: bottleneckAnalysis, isLoading: bottleneckLoading } = useQuery({
    queryKey: ['aps', 'bottleneck-analysis'],
    queryFn: () => apsApi.getBottleneckAnalysis('7d'),
    staleTime: 5 * 60 * 1000,
  });

  const handleRunSchedule = () => {
    scheduleMutation.mutate({
      strategy,
      overwrite_existing: true,
    });
  };

  const handleSimulate = () => {
    addNotification({
      type: 'info',
      title: '功能提示',
      message: '排程模拟功能开发中',
    });
  };

  const report = optimizationReport?.data;
  const bottleneck = bottleneckAnalysis?.data;

  return (
    <PageContainer title="APS 高级排程" subtitle="智能计划排程与优化分析">
      <Box sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab icon={<Brain size={16} />} iconPosition="start" label="智能排程" />
          <Tab icon={<BarChart3 size={16} />} iconPosition="start" label="优化报告" />
          <Tab icon={<Gauge size={16} />} iconPosition="start" label="瓶颈分析" />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box>
          {/* 排程控制面板 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Brain size={20} />
                排程策略配置
              </Typography>
              <Grid container spacing={3} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>排程策略</InputLabel>
                    <Select
                      value={strategy}
                      label="排程策略"
                      onChange={(e) => setStrategy(e.target.value as typeof strategy)}
                    >
                      <MenuItem value="forward">前向排程（最早开始）</MenuItem>
                      <MenuItem value="backward">后向排程（按期交付）</MenuItem>
                      <MenuItem value="bidirectional">双向排程（最优平衡）</MenuItem>
                      <MenuItem value="bottleneck_driven">瓶颈驱动（产能优先）</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<Play size={16} />}
                      onClick={handleRunSchedule}
                      disabled={scheduleMutation.isPending}
                      sx={{ flex: 1 }}
                    >
                      {scheduleMutation.isPending ? '排程中...' : '执行智能排程'}
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Zap size={16} />}
                      onClick={handleSimulate}
                      disabled={scheduleMutation.isPending}
                    >
                      模拟
                    </Button>
                  </Box>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  {strategy === 'forward' && (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      从最早可开始时间往后排，最小化总完工时间
                    </Alert>
                  )}
                  {strategy === 'backward' && (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      从交付期限往前倒推，确保按期交付
                    </Alert>
                  )}
                  {strategy === 'bidirectional' && (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      先后向确定最晚开始，再前向微调优化
                    </Alert>
                  )}
                  {strategy === 'bottleneck_driven' && (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      优先安排瓶颈资源，最大化整体产能
                    </Alert>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 排程结果 */}
          {scheduleMutation.isPending && (
            <Box sx={{ mb: 3 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                APS 正在计算最优排程方案...
              </Typography>
            </Box>
          )}

          {scheduleResult && (
            <>
              {/* 结果概览 */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">{scheduleResult.scheduled_orders}</Typography>
                      <Typography variant="body2" color="text.secondary">已排程订单</Typography>
                      <Typography variant="caption">/ {scheduleResult.total_orders} 总计</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {scheduleResult.average_utilization.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">平均利用率</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {scheduleResult.total_makespan_hours.toFixed(1)}h
                      </Typography>
                      <Typography variant="body2" color="text.secondary">总完工时间</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color={scheduleResult.tardy_count > 0 ? 'error' : 'success'}>
                        {scheduleResult.tardy_count}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">延期订单</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {scheduleResult.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  {scheduleResult.warnings.map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </Alert>
              )}

              {/* 排程明细表格 */}
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    排程明细
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>订单号</TableCell>
                          <TableCell>产品</TableCell>
                          <TableCell>数量</TableCell>
                          <TableCell>工位</TableCell>
                          <TableCell>计划开始</TableCell>
                          <TableCell>计划结束</TableCell>
                          <TableCell>加工时间</TableCell>
                          <TableCell>物料</TableCell>
                          <TableCell>可行性</TableCell>
                          <TableCell>风险</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {scheduleResult.items.map((item) => (
                          <TableRow
                            key={item.order_id}
                            hover
                            onClick={() => setSelectedItem(item)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell>{item.order_no}</TableCell>
                            <TableCell>{item.product_name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.work_station_name}</TableCell>
                            <TableCell>
                              {new Date(item.planned_start).toLocaleString('zh-CN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </TableCell>
                            <TableCell>
                              {new Date(item.planned_end).toLocaleString('zh-CN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </TableCell>
                            <TableCell>{item.processing_time_hours.toFixed(1)}h</TableCell>
                            <TableCell>
                              {item.material_ready ? (
                                <Chip size="small" icon={<CheckCircle size={14} />} label="齐套" color="success" />
                              ) : (
                                <Chip size="small" icon={<XCircle size={14} />} label="缺料" color="error" />
                              )}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={item.feasibility_score}
                                  sx={{ width: 60, height: 6, borderRadius: 3 }}
                                />
                                <Typography variant="caption">{item.feasibility_score.toFixed(0)}%</Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={riskLabelMap[item.risk_level] || item.risk_level}
                                sx={{
                                  bgcolor: riskColorMap[item.risk_level] || '#999',
                                  color: '#fff',
                                  fontWeight: 500,
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </>
          )}

          {!scheduleResult && !scheduleMutation.isPending && (
            <Card sx={{ textAlign: 'center', py: 8 }}>
              <CardContent>
                <Brain size={64} color="#ccc" style={{ marginBottom: 16 }} />
                <Typography variant="h6" color="text.secondary">
                  选择排程策略并点击"执行智能排程"
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  APS 将基于设备/工位/物料/人员约束自动生成最优排程方案
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {reportLoading ? (
            <LoadingSpinner />
          ) : report ? (
            <>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">{report.total_orders}</Typography>
                      <Typography variant="body2" color="text.secondary">总订单数</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">{report.on_time_rate.toFixed(1)}%</Typography>
                      <Typography variant="body2" color="text.secondary">准时交付率</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">{report.average_lead_time_hours.toFixed(1)}h</Typography>
                      <Typography variant="body2" color="text.secondary">平均交付周期</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">{report.unscheduled_orders}</Typography>
                      <Typography variant="body2" color="text.secondary">未排程订单</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Gauge size={18} />
                        瓶颈资源
                      </Typography>
                      {report.bottleneck_resources.map((r, i) => (
                        <Box key={i} sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">{r.resource_name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              队列: {r.queue_length} | 利用率: {r.utilization_rate.toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(r.utilization_rate, 100)}
                            color={r.utilization_rate > 80 ? 'error' : r.utilization_rate > 60 ? 'warning' : 'success'}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      ))}
                      {report.bottleneck_resources.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          暂无瓶颈资源数据
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp size={18} />
                        优化建议
                      </Typography>
                      {report.improvement_suggestions.map((s, i) => (
                        <Box key={i} sx={{ mb: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Chip size="small" label={s.category} color="primary" variant="outlined" />
                            <Typography variant="subtitle2">{s.title}</Typography>
                          </Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {s.description}
                          </Typography>
                          <Typography variant="caption" color="success.main">
                            预期效果: {s.estimated_impact}
                          </Typography>
                        </Box>
                      ))}
                      {report.improvement_suggestions.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          暂无优化建议
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          ) : (
            <Alert severity="info">暂无优化报告数据</Alert>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {bottleneckLoading ? (
            <LoadingSpinner />
          ) : bottleneck ? (
            <>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4">{bottleneck.throughput_analysis.total_orders}</Typography>
                      <Typography variant="body2" color="text.secondary">总订单</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {bottleneck.throughput_analysis.completed_orders}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">已完成</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {bottleneck.throughput_analysis.in_progress_orders}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">进行中</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="info.main">
                        {bottleneck.throughput_analysis.average_cycle_time_hours.toFixed(1)}h
                      </Typography>
                      <Typography variant="body2" color="text.secondary">平均周期</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>产能 vs 需求</Typography>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2">产能利用率</Typography>
                          <Typography variant="body2">
                            {bottleneck.capacity_vs_demand.capacity_utilization.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(bottleneck.capacity_vs_demand.capacity_utilization, 100)}
                          color={bottleneck.capacity_vs_demand.capacity_utilization > 90 ? 'error' : 'primary'}
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                      </Box>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">总产能</Typography>
                          <Typography variant="h6">
                            {bottleneck.capacity_vs_demand.total_capacity_hours.toFixed(0)}h
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary">总需求</Typography>
                          <Typography variant="h6">
                            {bottleneck.capacity_vs_demand.total_demand_hours.toFixed(0)}h
                          </Typography>
                        </Grid>
                      </Grid>
                      {bottleneck.capacity_vs_demand.capacity_gap_hours > 0 && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          产能缺口: {bottleneck.capacity_vs_demand.capacity_gap_hours.toFixed(1)} 小时
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>瓶颈资源排行</Typography>
                      {bottleneck.bottleneck_resources.map((r, i) => (
                        <Box key={i} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="h6" color="text.secondary" sx={{ width: 30 }}>
                            {i + 1}
                          </Typography>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="body2">{r.resource_name}</Typography>
                              <Typography variant="caption">
                                利用率 {r.utilization_rate.toFixed(1)}% | 队列 {r.queue_length}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(r.utilization_rate, 100)}
                              color={r.utilization_rate > 80 ? 'error' : 'primary'}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        </Box>
                      ))}
                      {bottleneck.bottleneck_resources.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          暂无瓶颈数据
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          ) : (
            <Alert severity="info">暂无瓶颈分析数据</Alert>
          )}
        </Box>
      )}

      {/* 详情弹窗 */}
      <Dialog open={!!selectedItem} onClose={() => setSelectedItem(null)} maxWidth="sm" fullWidth>
        <DialogTitle>排程详情</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ pt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">订单号</Typography>
                  <Typography variant="body1">{selectedItem.order_no}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">产品</Typography>
                  <Typography variant="body1">{selectedItem.product_name}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">数量</Typography>
                  <Typography variant="body1">{selectedItem.quantity}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">优先级</Typography>
                  <Typography variant="body1">{selectedItem.priority}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">工位</Typography>
                  <Typography variant="body1">{selectedItem.work_station_name}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">设备</Typography>
                  <Typography variant="body1">{selectedItem.equipment_name || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">计划开始</Typography>
                  <Typography variant="body1">
                    {new Date(selectedItem.planned_start).toLocaleString('zh-CN')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">计划结束</Typography>
                  <Typography variant="body1">
                    {new Date(selectedItem.planned_end).toLocaleString('zh-CN')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">加工时间</Typography>
                  <Typography variant="body1">{selectedItem.processing_time_hours.toFixed(2)} 小时</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">换型时间</Typography>
                  <Typography variant="body1">{selectedItem.setup_time_hours} 小时</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">物料齐套</Typography>
                  <Typography variant="body1">
                    {selectedItem.material_ready ? (
                      <Chip size="small" label="已齐套" color="success" />
                    ) : (
                      <Chip size="small" label="未齐套" color="error" />
                    )}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography variant="caption" color="text.secondary">可行性评分</Typography>
                  <Typography variant="body1">{selectedItem.feasibility_score.toFixed(0)} / 100</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedItem(null)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default ApsSchedulingPage;
