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
import i18n from '@/i18n';
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
import { designTokens } from '@topems/tokens';

const getSloTypeLabels = (): Record<string, string> => ({
  all: i18n.t('pages.slo_status_page.k0'),
  availability: i18n.t('pages.slo_status_page.k1'),
  latency: i18n.t('pages.slo_status_page.k2'),
  throughput: i18n.t('pages.slo_status_page.k3'),
  error_rate: i18n.t('pages.slo_status_page.k4'),
});

const statusColor = (s: string): 'success' | 'warning' | 'error' | 'default' => {
  if (s === 'healthy') return 'success';
  if (s === 'warning') return 'warning';
  if (s === 'critical') return 'error';
  return 'default';
};

const statusLabel = (s: string): string => {
  if (s === 'healthy') return i18n.t('pages.slo_status_page.k5');
  if (s === 'warning') return i18n.t('pages.slo_status_page.k6');
  if (s === 'critical') return i18n.t('pages.slo_status_page.k7');
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
          {i18n.t('monitor:slo_status_page.v0v1_6', {
            v0: consumed.toFixed(1),
            v1: total.toFixed(1),
          })}
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

const SLOStatusPage: React.FC = () => {
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

    staleTime: CACHE_DURATIONS.SHORT,
  });

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

    staleTime: CACHE_DURATIONS.SHORT,
  });

  const budgetQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MONITOR_SLO_BUDGET_BASE,
    queryFn: async () => {
      const res = await metricsApi.getSloBudget();
      return res.data ?? [];
    },

    staleTime: CACHE_DURATIONS.SHORT,
  });

  const violationsQuery = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.MONITOR_SLO_VIOLATIONS_BASE,
    queryFn: async () => {
      const res = await metricsApi.listSloViolations();
      return res.data?.items ?? [];
    },

    staleTime: CACHE_DURATIONS.SHORT,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => metricsApi.resolveSloViolation(id),
    onSuccess: () => {
      addNotification({
        type: 'success',
        title: i18n.t('pages.slo_status_page.k9'),
        message: i18n.t('pages.slo_status_page.k8'),
      });
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.MONITOR_SLO_BASE,
        exact: false,
        refetchType: 'active',
      });
    },
    onError: (err: unknown) => {
      addNotification({
        type: 'error',
        title: i18n.t('pages.slo_status_page.k10'),
        message: extractErrorMessage(err, i18n.t('pages.slo_status_page.k11')),
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
        title: i18n.t('pages.slo_status_page.slo_0'),
        value: summary?.total_slos ?? 0,
        unit: i18n.t('pages.slo_status_page.k12'),
        icon: <Target size={20} />,
        color: 'primary',
      },
      {
        id: 'healthy',
        title: i18n.t('pages.slo_status_page.k13'),
        value: summary?.healthy_count ?? 0,
        unit: i18n.t('pages.slo_status_page.k14'),
        icon: <CheckCircle2 size={20} />,
        color: 'success',
      },
      {
        id: 'warning',
        title: i18n.t('pages.slo_status_page.k15'),
        value: summary?.warning_count ?? 0,
        unit: i18n.t('pages.slo_status_page.k16'),
        icon: <AlertTriangle size={20} />,
        color: 'warning',
      },
      {
        id: 'critical',
        title: i18n.t('pages.slo_status_page.k17'),
        value: summary?.critical_count ?? 0,
        unit: i18n.t('pages.slo_status_page.k18'),
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
        title: i18n.t('pages.slo_status_page.k19'),
        subtitle: i18n.t('pages.slo_status_page.slo_20'),
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
                {i18n.t('pages.slo_status_page.k1')}
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
                  {i18n.t('pages.slo_status_page.24h_2')}
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
                  {i18n.t('pages.slo_status_page.k3')}
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
        title: i18n.t('pages.slo_status_page.k21'),
        subtitle: i18n.t('pages.slo_status_page.slo_22'),
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
      addNotification({
        type: 'success',
        title: i18n.t('pages.slo_status_page.k23'),
        message: i18n.t('pages.slo_status_page.slo_4'),
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: i18n.t('pages.slo_status_page.k24'),
        message: extractErrorMessage(err, i18n.t('pages.slo_status_page.k25')),
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
            <TableCell>{i18n.t('monitor:slo_status_page.slo_5')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k26')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k27')}</TableCell>
            <TableCell align='right'>{i18n.t('pages.slo_status_page.k28')}</TableCell>
            <TableCell align='right'>{i18n.t('pages.slo_status_page.k29')}</TableCell>
            <TableCell align='right'>{i18n.t('pages.slo_status_page.k30')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k31')}</TableCell>
            <TableCell align='right'>{i18n.t('pages.slo_status_page.k32')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k33')}</TableCell>
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
                      label={getSloTypeLabels()[s.slo_type] ?? s.slo_type}
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
                    {i18n.t('pages.slo_status_page.slo_5')}
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
            <TableCell>{i18n.t('pages.slo_status_page.k34')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k35')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k36')}</TableCell>
            <TableCell align='right'>{i18n.t('monitor:slo_status_page.1h_4')}</TableCell>
            <TableCell align='right'>{i18n.t('monitor:slo_status_page.6h_3')}</TableCell>
            <TableCell align='right'>{i18n.t('monitor:slo_status_page.24h_2')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k37')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k38')}</TableCell>
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
            <TableCell>{i18n.t('pages.slo_status_page.k39')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k40')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k41')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k42')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k43')}</TableCell>
            <TableCell align='right'>{i18n.t('monitor:slo_status_page.k1')}</TableCell>
            <TableCell>{i18n.t('pages.slo_status_page.k44')}</TableCell>
            <TableCell align='right'>{i18n.t('pages.slo_status_page.k45')}</TableCell>
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
                      {i18n.t('monitor:slo_status_page.k0', { v0: v.duration_minutes })}
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
                        label={i18n.t('pages.slo_status_page.k46')}
                        color='success'
                        variant='outlined'
                      />
                    ) : (
                      <Chip
                        size='small'
                        label={i18n.t('pages.slo_status_page.k47')}
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
                        {i18n.t('pages.slo_status_page.k6')}
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
            label: i18n.t('pages.slo_status_page.slo_48'),
            icon: <Plus size={18} />,
            color: 'primary.light',
            description: i18n.t('pages.slo_status_page.k49'),
            onClick: () =>
              addNotification({
                type: 'info',
                title: i18n.t('pages.slo_status_page.k50'),
                message: i18n.t('pages.slo_status_page.slo_7'),
              }),
          },
          {
            id: 'refresh',
            label: i18n.t('pages.slo_status_page.k51'),
            icon: <RefreshCw size={18} />,
            color: 'info.light',
            description: i18n.t('pages.slo_status_page.k52'),
            onClick: handleRefresh,
          },
        ]}
        quickActionsTitle={i18n.t('pages.slo_status_page.k53')}
        onRefresh={handleRefresh}
        recentTitle={i18n.t('pages.slo_status_page.slo_8')}
      >
        <Paper sx={{ mt: 3, p: 2, borderRadius: 2 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ mb: 2, alignItems: { md: 'center' } }}
          >
            <TextField
              size='small'
              placeholder={i18n.t('pages.slo_status_page.slo_54')}
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
              <InputLabel>{i18n.t('pages.slo_status_page.k55')}</InputLabel>
              <Select
                value={sloType}
                label={i18n.t('pages.slo_status_page.k56')}
                onChange={(e) => setSloType(String(e.target.value))}
              >
                {Object.entries(getSloTypeLabels()).map(([v, l]) => (
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
              <InputLabel>{i18n.t('pages.slo_status_page.k57')}</InputLabel>
              <Select
                value={statusFilter}
                label={i18n.t('pages.slo_status_page.k58')}
                onChange={(e) => setStatusFilter(String(e.target.value))}
              >
                <MenuItem value='all'>{i18n.t('pages.slo_status_page.k59')}</MenuItem>
                <MenuItem value='healthy'>{i18n.t('pages.slo_status_page.k60')}</MenuItem>
                <MenuItem value='warning'>{i18n.t('pages.slo_status_page.k61')}</MenuItem>
                <MenuItem value='critical'>{i18n.t('pages.slo_status_page.k62')}</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Chip
              icon={<Filter size={14} />}
              label={`${i18n.t('pages.slo_status_page.k9')} ${slos.length} ${i18n.t('pages.slo_status_page.k10')}`}
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
              label={i18n.t('pages.slo_status_page.slo_11')}
              icon={<Target size={14} />}
              iconPosition='start'
            />
            <Tab
              value='budget'
              label={i18n.t('pages.slo_status_page.k63')}
              icon={<Activity size={14} />}
              iconPosition='start'
            />
            <Tab
              value='violations'
              label={`${i18n.t('pages.slo_status_page.k12')}${violations.length})`}
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
        title={i18n.t('pages.slo_status_page.k64')}
        message={`${i18n.t('pages.slo_status_page.slo_13')}${confirmDialog.violation?.slo_name}${i18n.t('pages.slo_status_page.k14')}`}
      />
    </PageContainer>
  );
};

export default SLOStatusPage;
