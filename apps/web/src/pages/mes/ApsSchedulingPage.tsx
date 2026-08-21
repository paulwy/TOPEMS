import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from '@mui/material';
import i18n from '@/i18n';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import {
  Brain,
  Play,
  CheckCircle,
  XCircle,
  TrendingUp,
  Gauge,
  Zap,
  BarChart3,
  Eye,
} from 'lucide-react';
import { designTokens } from '@topems/tokens';
import type { ApsScheduleResult, ApsScheduleItem } from '@/api/mes';
import { apsApi } from '@/api/mes';
import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  StatCard,
  ChartConfig,
  DataTable,
  TabItem,
} from '@/components/templates/StatsPageTemplate';

const ct = designTokens.colors;

type TabValue = 'schedule' | 'optimization' | 'bottleneck';
type Strategy = 'forward' | 'backward' | 'bidirectional' | 'bottleneck_driven';

const riskColorMap: Record<string, string> = {
  low: ct.success.main,
  medium: ct.warning.main,
  high: ct.error.main,
  critical: ct.purple['500'],
};

const riskLabelMap: Record<string, string> = {
  low: i18n.t('pages.aps_scheduling_page.k0'),
  medium: i18n.t('pages.aps_scheduling_page.k1'),
  high: i18n.t('pages.aps_scheduling_page.k2'),
  critical: i18n.t('pages.aps_scheduling_page.k3'),
};

const strategyInfoMap: Record<Strategy, string> = {
  forward: i18n.t('pages.aps_scheduling_page.k6'),
  backward: i18n.t('pages.aps_scheduling_page.k7'),
  bidirectional: i18n.t('pages.aps_scheduling_page.k8'),
  bottleneck_driven: i18n.t('pages.aps_scheduling_page.k9'),
};

const ApsSchedulingPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState<TabValue>('schedule');
  const [strategy, setStrategy] = useState<Strategy>('forward');
  const [scheduleResult, setScheduleResult] = useState<ApsScheduleResult | null>(null);
  const [selectedItem, setSelectedItem] = useState<ApsScheduleItem | null>(null);

  const scheduleMutation = useMutation({
    mutationFn: apsApi.schedule,
    onSuccess: (res) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.AD_HOC.APS_OPTIMIZATION_REPORT_BASE,
        exact: false,
        refetchType: 'active',
      });
      if (res.success && res.data) {
        setScheduleResult(res.data);
        addNotification({
          type: 'success',
          title: i18n.t('pages.aps_scheduling_page.k4'),
          message: `${i18n.t('pages.aps_scheduling_page.aps_0')}${res.data.scheduled_orders}/${res.data.total_orders} ${i18n.t('pages.aps_scheduling_page.k1')}`,
        });
      } else {
        addNotification({
          type: 'error',
          title: i18n.t('pages.aps_scheduling_page.k5'),
          message: res.message || i18n.t('pages.aps_scheduling_page.k6'),
        });
      }
    },
    onError: (err: Error) =>
      addNotification({
        type: 'error',
        title: i18n.t('pages.aps_scheduling_page.k7'),
        message: err.message,
      }),
  });

  const { data: optimizationReport, isPending: reportLoading } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.APS_OPTIMIZATION_REPORT_BASE,
    queryFn: apsApi.getOptimizationReport,
    staleTime: 5 * 60 * 1000,
  });

  const { data: bottleneckAnalysis, isPending: bottleneckLoading } = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.APS_BOTTLENECK_ANALYSIS_BASE,
    queryFn: () => apsApi.getBottleneckAnalysis('7d'),
    staleTime: 5 * 60 * 1000,
  });

  const handleRunSchedule = useCallback(() => {
    scheduleMutation.mutate({
      strategy,
      overwrite_existing: true,
    });
  }, [scheduleMutation, strategy]);

  const handleSimulate = useCallback(() => {
    addNotification({
      type: 'info',
      title: i18n.t('pages.aps_scheduling_page.k8'),
      message: i18n.t('pages.aps_scheduling_page.k9'),
    });
  }, [addNotification]);

  const report = optimizationReport?.data;
  const bottleneck = bottleneckAnalysis?.data;

  const tabItems: TabItem[] = useMemo(
    () => [
      {
        value: 'schedule',
        label: i18n.t('pages.aps_scheduling_page.k11'),
        icon: <Brain size={16} />,
      },
      {
        value: 'optimization',
        label: i18n.t('pages.aps_scheduling_page.k12'),
        icon: <BarChart3 size={16} />,
      },
      {
        value: 'bottleneck',
        label: i18n.t('pages.aps_scheduling_page.k13'),
        icon: <Gauge size={16} />,
      },
    ],
    []
  );

  const loading = useMemo(() => {
    switch (activeTab) {
      case 'schedule':
        return scheduleMutation.isPending;
      case 'optimization':
        return reportLoading;
      case 'bottleneck':
        return bottleneckLoading;
      default:
        return false;
    }
  }, [activeTab, scheduleMutation.isPending, reportLoading, bottleneckLoading]);

  const statCards = useMemo<StatCard[]>(() => {
    if (activeTab === 'schedule' && scheduleResult) {
      return [
        {
          id: 'scheduled_orders',
          title: i18n.t('pages.aps_scheduling_page.k11'),
          value: scheduleResult.scheduled_orders,
          suffix: ` / ${scheduleResult.total_orders} ${i18n.t('pages.aps_scheduling_page.k0')}`,
          icon: <CheckCircle size={18} />,
          color: 'primary',
        },
        {
          id: 'average_utilization',
          title: i18n.t('pages.aps_scheduling_page.k12'),
          value: scheduleResult.average_utilization.toFixed(1),
          suffix: '%',
          icon: <TrendingUp size={18} />,
          color: 'success',
        },
        {
          id: 'total_makespan',
          title: i18n.t('pages.aps_scheduling_page.k13'),
          value: scheduleResult.total_makespan_hours.toFixed(1),
          suffix: 'h',
          icon: <Gauge size={18} />,
          color: 'warning',
        },
        {
          id: 'tardy_count',
          title: i18n.t('pages.aps_scheduling_page.k14'),
          value: scheduleResult.tardy_count,
          icon: <XCircle size={18} />,
          color: scheduleResult.tardy_count > 0 ? 'error' : 'success',
        },
      ];
    }

    if (activeTab === 'optimization' && report) {
      return [
        {
          id: 'total_orders',
          title: i18n.t('pages.aps_scheduling_page.k18'),
          value: report.total_orders,
          icon: <Brain size={18} />,
          color: 'primary',
        },
        {
          id: 'on_time_rate',
          title: i18n.t('pages.aps_scheduling_page.k19'),
          value: report.on_time_rate.toFixed(1),
          suffix: '%',
          icon: <CheckCircle size={18} />,
          color: 'success',
        },
        {
          id: 'average_lead_time',
          title: i18n.t('pages.aps_scheduling_page.k20'),
          value: report.average_lead_time_hours.toFixed(1),
          suffix: 'h',
          icon: <TrendingUp size={18} />,
          color: 'info',
        },
        {
          id: 'unscheduled_orders',
          title: i18n.t('pages.aps_scheduling_page.k21'),
          value: report.unscheduled_orders,
          icon: <XCircle size={18} />,
          color: 'warning',
        },
      ];
    }

    if (activeTab === 'bottleneck' && bottleneck) {
      return [
        {
          id: 'total_orders',
          title: i18n.t('pages.aps_scheduling_page.k29'),
          value: bottleneck.throughput_analysis.total_orders,
          icon: <Brain size={18} />,
          color: 'primary',
        },
        {
          id: 'completed_orders',
          title: i18n.t('pages.aps_scheduling_page.k30'),
          value: bottleneck.throughput_analysis.completed_orders,
          icon: <CheckCircle size={18} />,
          color: 'success',
        },
        {
          id: 'in_progress_orders',
          title: i18n.t('pages.aps_scheduling_page.k31'),
          value: bottleneck.throughput_analysis.in_progress_orders,
          icon: <Gauge size={18} />,
          color: 'warning',
        },
        {
          id: 'average_cycle_time',
          title: i18n.t('pages.aps_scheduling_page.k32'),
          value: bottleneck.throughput_analysis.average_cycle_time_hours.toFixed(1),
          suffix: 'h',
          icon: <TrendingUp size={18} />,
          color: 'info',
        },
      ];
    }

    return [];
  }, [activeTab, scheduleResult, report, bottleneck]);

  const charts = useMemo<ChartConfig[]>(() => {
    if (activeTab === 'schedule' && scheduleResult) {
      const riskCounts = scheduleResult.items.reduce(
        (acc, item) => {
          acc[item.risk_level] = (acc[item.risk_level] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );
      const data = Object.entries(riskCounts).map(([level, count]) => ({
        name: riskLabelMap[level] || level,
        value: count,
        color: riskColorMap[level],
      }));
      return data.length > 0
        ? [
            {
              id: 'risk-distribution',
              title: i18n.t('pages.aps_scheduling_page.k15'),
              type: 'pie',
              dataKey: 'value',
              nameKey: 'name',
              data,
            },
          ]
        : [];
    }

    if (activeTab === 'optimization' && report) {
      return [
        {
          id: 'bottleneck-utilization',
          title: i18n.t('pages.aps_scheduling_page.k22'),
          type: 'bar',
          dataKey: 'value',
          nameKey: 'name',
          data: report.bottleneck_resources
            .slice()
            .sort((a, b) => b.utilization_rate - a.utilization_rate)
            .map((r) => ({
              name: r.resource_name,
              value: Math.min(r.utilization_rate, 100),
              color:
                r.utilization_rate > 80
                  ? ct.error.main
                  : r.utilization_rate > 60
                    ? ct.warning.main
                    : ct.success.main,
            })),
        },
      ];
    }

    if (activeTab === 'bottleneck' && bottleneck) {
      const utilized = Math.min(bottleneck.capacity_vs_demand.capacity_utilization, 100);
      return [
        {
          id: 'capacity-utilization',
          title: i18n.t('pages.aps_scheduling_page.vs_33'),
          type: 'donut',
          dataKey: 'value',
          nameKey: 'name',
          data: [
            {
              name: i18n.t('pages.aps_scheduling_page.k35'),
              value: utilized,
              color: ct.primary.main,
            },
            {
              name: i18n.t('pages.aps_scheduling_page.k34'),
              value: Math.max(100 - utilized, 0),
              color: ct.grey[300],
            },
          ],
        },
        {
          id: 'bottleneck-resources',
          title: i18n.t('pages.aps_scheduling_page.k38'),
          type: 'bar',
          dataKey: 'value',
          nameKey: 'name',
          data: bottleneck.bottleneck_resources
            .slice()
            .sort((a, b) => b.utilization_rate - a.utilization_rate)
            .map((r) => ({
              name: r.resource_name,
              value: Math.min(r.utilization_rate, 100),
              color: r.utilization_rate > 80 ? ct.error.main : ct.primary.main,
            })),
        },
      ];
    }

    return [];
  }, [activeTab, scheduleResult, report, bottleneck]);

  const tables = useMemo<DataTable[]>(() => {
    if (activeTab === 'schedule' && scheduleResult) {
      return [
        {
          id: 'schedule-items',
          title: i18n.t('pages.aps_scheduling_page.k15'),
          columns: [
            {
              id: 'orderNo',
              label: i18n.t('pages.aps_scheduling_page.k21'),
              field: 'orderNo',
            },
            {
              id: 'product_name',
              label: i18n.t('pages.aps_scheduling_page.k22'),
              field: 'product_name',
            },
            {
              id: 'quantity',
              label: i18n.t('pages.aps_scheduling_page.k23'),
              field: 'quantity',
              align: 'center',
            },
            {
              id: 'work_station_name',
              label: i18n.t('pages.aps_scheduling_page.k24'),
              field: 'work_station_name',
            },
            {
              id: 'planned_start',
              label: i18n.t('pages.aps_scheduling_page.k25'),
              field: 'planned_start',
              render: (value) =>
                new Date(String(value)).toLocaleString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
            },
            {
              id: 'planned_end',
              label: i18n.t('pages.aps_scheduling_page.k26'),
              field: 'planned_end',
              render: (value) =>
                new Date(String(value)).toLocaleString('zh-CN', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
            },
            {
              id: 'processing_time_hours',
              label: i18n.t('pages.aps_scheduling_page.k27'),
              field: 'processing_time_hours',
              align: 'center',
              render: (value) => `${Number(value).toFixed(1)}h`,
            },
            {
              id: 'material_ready',
              label: i18n.t('pages.aps_scheduling_page.k28'),
              field: 'material_ready',
              align: 'center',
              render: (value) =>
                value ? (
                  <Chip
                    size='small'
                    icon={<CheckCircle size={14} />}
                    label={i18n.t('pages.aps_scheduling_page.k31')}
                    color='success'
                  />
                ) : (
                  <Chip
                    size='small'
                    icon={<XCircle size={14} />}
                    label={i18n.t('pages.aps_scheduling_page.k32')}
                    color='error'
                  />
                ),
            },
            {
              id: 'feasibility_score',
              label: i18n.t('pages.aps_scheduling_page.k29'),
              field: 'feasibility_score',
              align: 'center',
              render: (value) => (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant='determinate'
                    value={Number(value)}
                    sx={{
                      width: 60,
                      height: 1,
                      borderRadius: 9999,
                    }}
                  />
                  <Typography variant='caption'>{Number(value).toFixed(0)}%</Typography>
                </Box>
              ),
            },
            {
              id: 'risk_level',
              label: i18n.t('pages.aps_scheduling_page.k30'),
              field: 'risk_level',
              align: 'center',
              render: (value) => (
                <Chip
                  size='small'
                  label={riskLabelMap[String(value)] || String(value)}
                  sx={{
                    bgcolor: riskColorMap[String(value)] || ct.grey[400],
                    color: ct.common.white,
                    fontWeight: 500,
                  }}
                />
              ),
            },
            {
              id: 'detail',
              label: i18n.t('pages.aps_scheduling_page.k37'),
              align: 'center',
              render: (_value, row) => (
                <IconButton
                  size='small'
                  onClick={() => setSelectedItem(row as unknown as ApsScheduleItem)}
                  aria-label={i18n.t('pages.aps_scheduling_page.k37')}
                >
                  <Eye size={16} />
                </IconButton>
              ),
            },
          ],
          data: scheduleResult.items as unknown as Record<string, unknown>[],
        },
      ];
    }

    if (activeTab === 'optimization' && report) {
      return [
        {
          id: 'improvement-suggestions',
          title: i18n.t('pages.aps_scheduling_page.k26'),
          columns: [
            {
              id: 'category',
              label: i18n.t('pages.aps_scheduling_page.k23'),
              field: 'category',
              align: 'center',
              render: (value) => (
                <Chip
                  size='small'
                  label={String(value)}
                  color='primary'
                  variant='outlined'
                />
              ),
            },
            {
              id: 'title',
              label: i18n.t('pages.aps_scheduling_page.k22'),
              field: 'title',
            },
            {
              id: 'description',
              label: i18n.t('pages.aps_scheduling_page.k24'),
              field: 'description',
            },
            {
              id: 'estimated_impact',
              label: i18n.t('pages.aps_scheduling_page.k27'),
              field: 'estimated_impact',
              align: 'center',
              render: (value) => (
                <Typography
                  variant='caption'
                  color='success.main'
                >
                  {String(value)}
                </Typography>
              ),
            },
          ],
          data: report.improvement_suggestions as unknown as Record<string, unknown>[],
        },
      ];
    }

    if (activeTab === 'bottleneck' && bottleneck) {
      return [
        {
          id: 'bottleneck-resources',
          title: i18n.t('pages.aps_scheduling_page.k38'),
          columns: [
            {
              id: 'rank',
              label: '#',
              align: 'center',
              render: (_value, row) => String(Number(row._index) + 1),
            },
            {
              id: 'resource_name',
              label: i18n.t('pages.aps_scheduling_page.k22'),
              field: 'resource_name',
            },
            {
              id: 'utilization_rate',
              label: i18n.t('pages.aps_scheduling_page.k1'),
              field: 'utilization_rate',
              align: 'center',
              render: (value) => `${Number(value).toFixed(1)}%`,
            },
            {
              id: 'queue_length',
              label: i18n.t('pages.aps_scheduling_page.k2'),
              field: 'queue_length',
              align: 'center',
            },
          ],
          data: bottleneck.bottleneck_resources.map((r, index) => ({
            ...r,
            _index: index,
          })) as Record<string, unknown>[],
        },
      ];
    }

    return [];
  }, [activeTab, scheduleResult, report, bottleneck]);

  const customToolbar = useMemo(
    () => (
      <Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl
            size='small'
            sx={{ minWidth: '25ch' }}
          >
            <InputLabel>{i18n.t('pages.aps_scheduling_page.k14')}</InputLabel>
            <Select
              value={strategy}
              label={i18n.t('pages.aps_scheduling_page.k15')}
              onChange={(e) => setStrategy(e.target.value as Strategy)}
            >
              <MenuItem value='forward'>{i18n.t('pages.aps_scheduling_page.k16')}</MenuItem>
              <MenuItem value='backward'>{i18n.t('pages.aps_scheduling_page.k17')}</MenuItem>
              <MenuItem value='bidirectional'>{i18n.t('pages.aps_scheduling_page.k18')}</MenuItem>
              <MenuItem value='bottleneck_driven'>
                {i18n.t('pages.aps_scheduling_page.k19')}
              </MenuItem>
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant='contained'
              startIcon={<Play size={16} />}
              onClick={handleRunSchedule}
              disabled={scheduleMutation.isPending}
            >
              {scheduleMutation.isPending
                ? i18n.t('pages.aps_scheduling_page.k4')
                : i18n.t('pages.aps_scheduling_page.k20')}
            </Button>
            <Button
              variant='outlined'
              startIcon={<Zap size={16} />}
              onClick={handleSimulate}
              disabled={scheduleMutation.isPending}
            >
              {i18n.t('pages.aps_scheduling_page.k5')}
            </Button>
          </Box>
        </Box>
        <Alert
          severity='info'
          sx={{ mt: 2, py: 0.5 }}
        >
          {strategyInfoMap[strategy]}
        </Alert>
      </Box>
    ),
    [strategy, scheduleMutation.isPending, handleRunSchedule, handleSimulate]
  );

  const children = useMemo(() => {
    if (activeTab === 'schedule') {
      if (scheduleMutation.isPending) {
        return (
          <Box sx={{ mb: 3 }}>
            <LinearProgress />
            <Typography
              variant='body2'
              sx={{ mt: 1, textAlign: 'center' }}
            >
              {i18n.t('pages.aps_scheduling_page.k10')}
            </Typography>
          </Box>
        );
      }

      if (scheduleResult && scheduleResult.warnings.length > 0) {
        return (
          <Alert
            severity='warning'
            sx={{ mb: 3 }}
          >
            {scheduleResult.warnings.map((w, i) => (
              <div key={i}>{w}</div>
            ))}
          </Alert>
        );
      }

      if (!scheduleResult && !scheduleMutation.isPending) {
        return (
          <Box
            sx={{
              textAlign: 'center',
              py: 8,
              bgcolor: 'background.paper',
              borderRadius: 4,
            }}
          >
            <Brain
              size={64}
              color={ct.grey[300]}
              style={{ marginBottom: 16 }}
            />
            <Typography
              variant='h6'
              color='text.secondary'
            >
              {i18n.t('pages.aps_scheduling_page.k33')}
            </Typography>
            <Typography
              variant='body2'
              color='text.secondary'
              sx={{ mt: 1 }}
            >
              {i18n.t('pages.aps_scheduling_page.k17')}
            </Typography>
          </Box>
        );
      }

      return null;
    }

    if (activeTab === 'optimization') {
      if (!report && !reportLoading) {
        return <Alert severity='info'>{i18n.t('pages.aps_scheduling_page.k34')}</Alert>;
      }
      return null;
    }

    if (activeTab === 'bottleneck') {
      if (!bottleneck && !bottleneckLoading) {
        return <Alert severity='info'>{i18n.t('pages.aps_scheduling_page.k36')}</Alert>;
      }
      if (bottleneck && bottleneck.capacity_vs_demand.capacity_gap_hours > 0) {
        return (
          <Alert severity='error'>
            {i18n.t('pages.aps_scheduling_page.k36')}:{' '}
            {bottleneck.capacity_vs_demand.capacity_gap_hours.toFixed(1)}{' '}
            {i18n.t('pages.aps_scheduling_page.k37')}
          </Alert>
        );
      }
      return null;
    }

    return null;
  }, [
    activeTab,
    scheduleMutation.isPending,
    scheduleResult,
    report,
    reportLoading,
    bottleneck,
    bottleneckLoading,
  ]);

  return (
    <>
      <StatsPageTemplate
        title={i18n.t('pages.aps_scheduling_page.aps_2')}
        subtitle={i18n.t('pages.aps_scheduling_page.k10')}
        tabs={tabItems}
        tabValue={activeTab}
        onTabChange={(value) => setActiveTab(value as TabValue)}
        statCards={statCards}
        statColumns={4}
        charts={charts}
        tables={tables}
        loading={loading}
        customToolbar={customToolbar}
        showSearch={false}
        showTimeRange={false}
        showExport={false}
        showRefresh={false}
      >
        {children}
      </StatsPageTemplate>

      <Dialog
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        maxWidth='sm'
        fullWidth
      >
        <DialogTitle>{i18n.t('pages.aps_scheduling_page.k37')}</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ pt: 1 }}>
              <Grid
                container
                spacing={2}
              >
                <Grid size={{ xs: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.aps_scheduling_page.k40')}
                  </Typography>
                  <Typography variant='body1'>{selectedItem.orderNo}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.aps_scheduling_page.k41')}
                  </Typography>
                  <Typography variant='body1'>{selectedItem.product_name}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.aps_scheduling_page.k42')}
                  </Typography>
                  <Typography variant='body1'>{selectedItem.quantity}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.aps_scheduling_page.k43')}
                  </Typography>
                  <Typography variant='body1'>{selectedItem.priority}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.aps_scheduling_page.k44')}
                  </Typography>
                  <Typography variant='body1'>{selectedItem.work_station_name}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.aps_scheduling_page.k45')}
                  </Typography>
                  <Typography variant='body1'>{selectedItem.equipment_name || '-'}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.aps_scheduling_page.k46')}
                  </Typography>
                  <Typography variant='body1'>
                    {new Date(selectedItem.planned_start).toLocaleString('zh-CN')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.aps_scheduling_page.k47')}
                  </Typography>
                  <Typography variant='body1'>
                    {new Date(selectedItem.planned_end).toLocaleString('zh-CN')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.aps_scheduling_page.k48')}
                  </Typography>
                  <Typography variant='body1'>
                    {selectedItem.processing_time_hours.toFixed(2)}{' '}
                    {i18n.t('pages.aps_scheduling_page.k3')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.aps_scheduling_page.k49')}
                  </Typography>
                  <Typography variant='body1'>{i18n.t('pages.aps_scheduling_page.k0')}</Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.aps_scheduling_page.k50')}
                  </Typography>
                  <Typography variant='body1'>
                    {selectedItem.material_ready ? (
                      <Chip
                        size='small'
                        label={i18n.t('pages.aps_scheduling_page.k38')}
                        color='success'
                      />
                    ) : (
                      <Chip
                        size='small'
                        label={i18n.t('pages.aps_scheduling_page.k39')}
                        color='error'
                      />
                    )}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Typography
                    variant='caption'
                    color='text.secondary'
                  >
                    {i18n.t('pages.aps_scheduling_page.k51')}
                  </Typography>
                  <Typography variant='body1'>
                    {selectedItem.feasibility_score.toFixed(0)} / 100
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedItem(null)}>
            {i18n.t('pages.aps_scheduling_page.k40')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ApsSchedulingPage;
