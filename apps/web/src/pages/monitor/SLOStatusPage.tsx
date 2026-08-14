/**
 * SLO/SLA 看板页面
 *
 * @module pages/monitor
 * @path /monitor/slo
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Target,
  Shield,
  AlertTriangle,
  Activity,
  Clock,
  Flame,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Plus,
  Filter,
} from 'lucide-react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  LinearProgress,
  Skeleton,
  Tabs,
  Tab,
  Button,
  useTheme,
} from '@mui/material';

import { PageContainer } from '@/components/common';
import { DashboardTemplate, type StatCard, type ChartCard } from '@/components/templates';
import { ConfirmDialog } from '@topems/shared-components';
import { useNotificationStore } from '@/store';
import { metricsApi, type Slo, type SloBudget, type SloViolation } from '@/api/monitor/metrics';
import { extractErrorMessage } from '@/utils/errors';
import { MONITOR_PATHS } from '@/modules/monitor/config';

import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import { designTokens, semanticTokens } from '@topems/tokens';

const SLO_TYPE_LABELS: Record<string, string> = {
  all: '全部类型',
  availability: '可用性',
  latency: '延迟',
  throughput: '吞吐',
  error_rate: '错误率',
};

const statusColor = (s: string): 'success' | 'warning' | 'error' | 'default' => {
  if (s === 'healthy') return 'success';
  if (s === 'warning') return 'warning';
  if (s === 'critical') return 'error';
  return 'default';
};

const statusLabel = (s: string): string => {
  if (s === 'healthy') return '健康';
  if (s === 'warning') return '风险';
  if (s === 'critical') return '严重';
  return s;
};

const BudgetBar: React.FC<{ consumed: number; total: number }> = ({ consumed, total }) => {
  const percent = total > 0 ? Math.min(100, (consumed / total) * 100) : 0;
  const color = percent >= 80 ? 'error.main' : percent >= 50 ? 'warning.main' : 'success.main';
  return (
    <Box sx={{ minWidth: 140 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography
          variant='caption'
          color='text.secondary'
        >
          已消耗 {consumed.toFixed(1)} / {total.toFixed(1)}
        </Typography>
        <Typography
          variant='caption'
          sx={{ fontWeight: 600, color }}
        >
          {percent.toFixed(0)}%
        </Typography>
      </Box>
      <LinearProgress
        variant='determinate'
        value={percent}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': { bgcolor: color },
        }}
      />
    </Box>
  );
};

const MiniLineChart: React.FC<{ data: number[]; color?: string; height?: number }> = ({
  data,
  color = designTokens.colors.primary.dark,
  height = 120,
}) => {
  if (!data || data.length === 0) return <Box sx={{ width: '100%', height }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const padding = { top: 8, right: 8, bottom: 8, left: 8 };
  const denom = data.length - 1 || 1;
  const points = data
    .map((v, i) => {
      const x = padding.left + (i / denom) * (width - padding.left - padding.right);
      const y =
        padding.top +
        (40 - padding.top - padding.bottom) -
        ((v - min) / range) * (40 - padding.top - padding.bottom);
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <Box sx={{ width: '100%', height }}>
      <svg
        width='100%'
        height='100%'
        viewBox='0 0 100 40'
        preserveAspectRatio='none'
      >
        <polyline
          points={points}
          fill='none'
          stroke={color}
          strokeWidth='1.2'
        />
      </svg>
    </Box>
  );
};

export const SLOStatusPage: React.FC = () => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const addNotification = useNotificationStore((state) => state.addNotification);

  const [keyword, setKeyword] = useState('');
  const [sloType, setSloType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tab, setTab] = useState<'slos' | 'budget' | 'violations'>('slos');

  const summaryQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MONITOR_SLO_SUMMARY_BASE,
    queryFn: async () => {
      const res = await metricsApi.getSloSummary();
      return res.data;
    },
  
      staleTime: CACHE_DURATIONS.SHORT,});

  const listQuery = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.MONITOR_SLO_LIST_BASE, sloType, statusFilter, keyword],
    queryFn: async () => {
      const res = await metricsApi.listSlos({
        slo_type: sloType === 'all' ? undefined : sloType,
        status: statusFilter === 'all' ? undefined : statusFilter,
        keyword: keyword || undefined,
      });
      return res.data?.items ?? [];
    },
  
      staleTime: CACHE_DURATIONS.SHORT,});

  const budgetQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MONITOR_SLO_BUDGET_BASE,
    queryFn: async () => {
      const res = await metricsApi.getSloBudget();
      return res.data ?? [];
    },
  
      staleTime: CACHE_DURATIONS.SHORT,});

  const violationsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MONITOR_SLO_VIOLATIONS_BASE,
    queryFn: async () => {
      const res = await metricsApi.listSloViolations();
      return res.data?.items ?? [];
    },
  
      staleTime: CACHE_DURATIONS.SHORT,});

  const resolveMutation = useMutation({
    mutationFn: (id: string) => metricsApi.resolveSloViolation(id),
    onSuccess: () => {
      addNotification({ type: 'success', title: '已处理', message: '违规记录已标记为已处理' });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.AD_HOC.MONITOR_SLO_BASE ,
  exact: false,
  refetchType: 'active',
});
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        title: '处理失败',
        message: extractErrorMessage(err, '处理失败'),
      });
    },
  });

  const summary = summaryQuery.data;
  const slos: Slo[] = listQuery.data ?? [];
  const budgets: SloBudget[] = budgetQuery.data ?? [];
  const violations: SloViolation[] = violationsQuery.data ?? [];

  const stats: StatCard[] = useMemo(
    () => [
      {
        id: 'total',
        title: 'SLO 总数',
        value: summary?.total_slos ?? 0,
        unit: '个',
        icon: <Target size={20} />,
        color: 'primary',
      },
      {
        id: 'healthy',
        title: '健康',
        value: summary?.healthy_count ?? 0,
        unit: '个',
        icon: <CheckCircle2 size={20} />,
        color: 'success',
      },
      {
        id: 'warning',
        title: '风险',
        value: summary?.warning_count ?? 0,
        unit: '个',
        icon: <AlertTriangle size={20} />,
        color: 'warning',
      },
      {
        id: 'critical',
        title: '严重',
        value: summary?.critical_count ?? 0,
        unit: '个',
        icon: <XCircle size={20} />,
        color: 'error',
      },
    ],
    [summary]
  );

  const avgCompliance = summary?.avg_compliance ?? 0;
  const budgetBurnRate =
    budgets.length > 0 ? budgets.reduce((sum, b) => sum + b.burn_rate_24h, 0) / budgets.length : 0;

  const charts: ChartCard[] = useMemo(
    () => [
      {
        id: 'compliance-overview',
        title: '合规率总览',
        subtitle: '所有 SLO 平均合规率',
        type: 'bar',
        chart: (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
              <Typography
                variant='h3'
                sx={{ fontWeight: 700, color: 'success.main' }}
              >
                {avgCompliance.toFixed(2)}
              </Typography>
              <Typography
                variant='body2'
                color='text.secondary'
              >
                % 平均合规率
              </Typography>
            </Box>
            <LinearProgress
              variant='determinate'
              value={avgCompliance}
              sx={{
                height: 12,
                borderRadius: 6,
                bgcolor: 'grey.200',
                '& .MuiLinearProgress-bar': { bgcolor: 'success.main' },
              }}
            />
            <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  24h 燃烧率
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ color: budgetBurnRate > 1 ? 'error.main' : 'success.main' }}
                >
                  {budgetBurnRate.toFixed(2)}x
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant='caption'
                  color='text.secondary'
                >
                  进行中违规
                </Typography>
                <Typography
                  variant='h6'
                  sx={{ color: 'error.main' }}
                >
                  {violations.filter((v) => !v.resolved).length}
                </Typography>
              </Box>
            </Box>
          </Box>
        ),
      },
      {
        id: 'budget-trend',
        title: '错误预算趋势',
        subtitle: '所有 SLO 错误预算剩余',
        type: 'line',
        chart: (
          <Box sx={{ height: 220, p: 1 }}>
            {budgetQuery.isLoading ? (
              <Skeleton
                variant='rectangular'
                height='100%'
              />
            ) : (
              <MiniLineChart
                data={budgets.slice(0, 12).map((b) => b.remaining_percent)}
                color={theme.palette.primary.main}
              />
            )}
          </Box>
        ),
      },
    ],
    [avgCompliance, budgetBurnRate, violations, budgets, budgetQuery.isLoading, theme]
  );

  const handleRefresh = async () => {
    try {
      await Promise.allSettled([
        summaryQuery.refetch(),
        listQuery.refetch(),
        budgetQuery.refetch(),
        violationsQuery.refetch(),
      ]);
      addNotification({ type: 'success', title: '已刷新', message: 'SLO 数据已更新' });
    } catch (err) {
      addNotification({
        type: 'error',
        title: '刷新失败',
        message: extractErrorMessage(err, '刷新失败'),
      });
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    violation: SloViolation | null;
  }>({ open: false, violation: null });

  const openResolve = (v: SloViolation) => setConfirmDialog({ open: true, violation: v });
  const closeResolve = () => setConfirmDialog({ open: false, violation: null });

  const renderSloTable = () => (
    <TableContainer>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>SLO 名称</TableCell>
            <TableCell>服务</TableCell>
            <TableCell>类型</TableCell>
            <TableCell align='right'>目标</TableCell>
            <TableCell align='right'>当前</TableCell>
            <TableCell align='right'>合规率</TableCell>
            <TableCell>错误预算</TableCell>
            <TableCell align='right'>燃烧率</TableCell>
            <TableCell>状态</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {listQuery.isLoading
            ? Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={idx}>
                  {Array.from({ length: 9 }).map((_, c) => (
                    <TableCell key={c}>
                      <Skeleton variant='text' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : slos.map((s) => (
                <TableRow
                  key={s.id}
                  hover
                >
                  <TableCell>
                    <Box>
                      <Typography
                        variant='body2'
                        sx={{ fontWeight: 500 }}
                      >
                        {s.name}
                      </Typography>
                      {s.description && (
                        <Typography
                          variant='caption'
                          color='text.secondary'
                        >
                          {s.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {s.service_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      label={SLO_TYPE_LABELS[s.slo_type] ?? s.slo_type}
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell align='right'>
                    <Typography variant='body2'>
                      {s.target}
                      {s.slo_type === 'latency' ? 'ms' : '%'}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography
                      variant='body2'
                      sx={{ fontWeight: 600 }}
                    >
                      {s.current_value}
                      {s.slo_type === 'latency' ? 'ms' : '%'}
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Chip
                      size='small'
                      label={`${s.compliance_rate.toFixed(2)}%`}
                      color={
                        s.compliance_rate >= 99
                          ? 'success'
                          : s.compliance_rate >= 95
                            ? 'warning'
                            : 'error'
                      }
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>
                    <BudgetBar
                      consumed={s.error_budget_consumed}
                      total={s.error_budget_total}
                    />
                  </TableCell>
                  <TableCell align='right'>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 0.5,
                      }}
                    >
                      <Flame
                        size={14}
                        color={
                          s.burn_rate > 1 ? theme.palette.error.main : theme.palette.success.main
                        }
                      />
                      <Typography
                        variant='body2'
                        sx={{
                          fontWeight: 600,
                          color: s.burn_rate > 1 ? 'error.main' : 'success.main',
                        }}
                      >
                        {s.burn_rate.toFixed(1)}x
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      label={statusLabel(s.status)}
                      color={statusColor(s.status)}
                    />
                  </TableCell>
                </TableRow>
              ))}
          {!listQuery.isLoading && slos.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={9}
                align='center'
              >
                <Box sx={{ py: 4 }}>
                  <Target
                    size={32}
                    color={theme.palette.text.disabled}
                  />
                  <Typography
                    variant='body2'
                    color='text.secondary'
                    sx={{ mt: 1 }}
                  >
                    暂无 SLO
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderBudgetTable = () => (
    <TableContainer>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>SLO</TableCell>
            <TableCell>服务</TableCell>
            <TableCell>周期</TableCell>
            <TableCell>消耗进度</TableCell>
            <TableCell align='right'>1h 燃烧</TableCell>
            <TableCell align='right'>6h 燃烧</TableCell>
            <TableCell align='right'>24h 燃烧</TableCell>
            <TableCell>预计耗尽</TableCell>
            <TableCell>状态</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {budgetQuery.isLoading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <TableRow key={idx}>
                  {Array.from({ length: 9 }).map((_, c) => (
                    <TableCell key={c}>
                      <Skeleton variant='text' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : budgets.map((b) => (
                <TableRow
                  key={b.slo_id}
                  hover
                >
                  <TableCell sx={{ fontWeight: 500 }}>{b.slo_name}</TableCell>
                  <TableCell>
                    <Typography
                      variant='caption'
                      color='text.secondary'
                    >
                      {b.service_name}
                    </Typography>
                  </TableCell>
                  <TableCell>{b.window}</TableCell>
                  <TableCell>
                    <BudgetBar
                      consumed={b.consumed}
                      total={b.total_budget}
                    />
                  </TableCell>
                  <TableCell align='right'>{b.burn_rate_1h.toFixed(2)}x</TableCell>
                  <TableCell align='right'>{b.burn_rate_6h.toFixed(2)}x</TableCell>
                  <TableCell align='right'>{b.burn_rate_24h.toFixed(2)}x</TableCell>
                  <TableCell>
                    <Typography
                      variant='caption'
                      color={b.projected_exhaustion ? 'error.main' : 'text.secondary'}
                    >
                      {b.projected_exhaustion
                        ? new Date(b.projected_exhaustion).toLocaleDateString('zh-CN')
                        : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      label={statusLabel(b.status)}
                      color={statusColor(b.status)}
                    />
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const renderViolationsTable = () => (
    <TableContainer>
      <Table size='small'>
        <TableHead>
          <TableRow>
            <TableCell>SLO</TableCell>
            <TableCell>服务</TableCell>
            <TableCell>类型</TableCell>
            <TableCell>严重程度</TableCell>
            <TableCell>开始时间</TableCell>
            <TableCell>持续</TableCell>
            <TableCell align='right'>当前/目标</TableCell>
            <TableCell>状态</TableCell>
            <TableCell align='right'>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {violationsQuery.isLoading
            ? Array.from({ length: 3 }).map((_, idx) => (
                <TableRow key={idx}>
                  {Array.from({ length: 9 }).map((_, c) => (
                    <TableCell key={c}>
                      <Skeleton variant='text' />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : violations.map((v) => (
                <TableRow
                  key={v.id}
                  hover
                >
                  <TableCell sx={{ fontWeight: 500 }}>{v.slo_name}</TableCell>
                  <TableCell>{v.service_name}</TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      label={v.violation_type}
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size='small'
                      label={v.severity}
                      color={statusColor(v.severity)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant='caption'>
                      {new Date(v.start_time).toLocaleString('zh-CN')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant='caption'>
                      <Clock
                        size={12}
                        style={{ verticalAlign: 'middle', marginRight: 4 }}
                      />
                      {v.duration_minutes} 分钟
                    </Typography>
                  </TableCell>
                  <TableCell align='right'>
                    <Typography
                      variant='body2'
                      sx={{ fontFamily: 'monospace' }}
                    >
                      {v.current_value} / {v.target_value}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {v.resolved ? (
                      <Chip
                        size='small'
                        label='已处理'
                        color='success'
                        variant='outlined'
                      />
                    ) : (
                      <Chip
                        size='small'
                        label='未处理'
                        color='error'
                      />
                    )}
                  </TableCell>
                  <TableCell align='right'>
                    {!v.resolved && (
                      <Button
                        size='small'
                        onClick={() => openResolve(v)}
                      >
                        处理
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <PageContainer
      headerProps={{
        pageIcon: <Shield size={20} />,
        backButton: { href: MONITOR_PATHS.dashboard },
      }}
    >
      <DashboardTemplate
        title=''
        subtitle=''
        loading={summaryQuery.isLoading || listQuery.isLoading || budgetQuery.isLoading}
        stats={stats}
        charts={charts}
        quickActions={[
          {
            id: 'create',
            label: '新建 SLO',
            icon: <Plus size={18} />,
            color: 'primary.light',
            description: '创建服务等级目标',
            onClick: () =>
              addNotification({
                type: 'info',
                title: '提示',
                message: 'SLO 创建向导开发中',
              }),
          },
          {
            id: 'refresh',
            label: '刷新',
            icon: <RefreshCw size={18} />,
            color: 'info.light',
            description: '重新加载数据',
            onClick: handleRefresh,
          },
        ]}
        quickActionsTitle='快捷操作'
        onRefresh={handleRefresh}
        recentTitle='SLO 详情'
      >
        <Paper sx={{ mt: 3, p: 2, borderRadius: 2 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ mb: 2, alignItems: { md: 'center' } }}
          >
            <TextField
              size='small'
              placeholder='搜索 SLO 名称或服务'
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <Search
                      size={16}
                      style={{ marginRight: 8 }}
                    />
                  ),
                },
              }}
              sx={{ minWidth: 220 }}
            />
            <FormControl
              size='small'
              sx={{ minWidth: 140 }}
            >
              <InputLabel>类型</InputLabel>
              <Select
                value={sloType}
                label='类型'
                onChange={(e) => setSloType(String(e.target.value))}
              >
                {Object.entries(SLO_TYPE_LABELS).map(([v, l]) => (
                  <MenuItem
                    key={v}
                    value={v}
                  >
                    {l}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl
              size='small'
              sx={{ minWidth: 120 }}
            >
              <InputLabel>状态</InputLabel>
              <Select
                value={statusFilter}
                label='状态'
                onChange={(e) => setStatusFilter(String(e.target.value))}
              >
                <MenuItem value='all'>全部</MenuItem>
                <MenuItem value='healthy'>健康</MenuItem>
                <MenuItem value='warning'>风险</MenuItem>
                <MenuItem value='critical'>严重</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Chip
              icon={<Filter size={14} />}
              label={`共 ${slos.length} 条`}
              variant='outlined'
              size='small'
            />
          </Stack>

          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab
              value='slos'
              label='SLO 列表'
              icon={<Target size={14} />}
              iconPosition='start'
            />
            <Tab
              value='budget'
              label='错误预算'
              icon={<Activity size={14} />}
              iconPosition='start'
            />
            <Tab
              value='violations'
              label={`违规记录 (${violations.length})`}
              icon={<AlertTriangle size={14} />}
              iconPosition='start'
            />
          </Tabs>

          {tab === 'slos' && renderSloTable()}
          {tab === 'budget' && renderBudgetTable()}
          {tab === 'violations' && renderViolationsTable()}
        </Paper>
      </DashboardTemplate>

      <ConfirmDialog
        isOpen={confirmDialog.open}
        onClose={closeResolve}
        onConfirm={() => {
          if (confirmDialog.violation) {
            resolveMutation.mutate(confirmDialog.violation.id);
          }
          closeResolve();
        }}
        title='处理违规'
        message={`确认将 SLO 违规 "${confirmDialog.violation?.slo_name}" 标记为已处理？`}
      />
    </PageContainer>
  );
};

export default SLOStatusPage;
