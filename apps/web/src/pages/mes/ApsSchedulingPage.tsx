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
import i18n from '@/i18n';
import { PageContainer } from '@/components/common';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store';
import { LoadingSpinner } from '@topems/shared-components';
import { Brain, Play, CheckCircle, XCircle, TrendingUp, Gauge, Zap, BarChart3 } from 'lucide-react';
import { designTokens, semanticTokens } from '@topems/tokens';
import type {
  ApsScheduleResult,
  ApsScheduleItem,
  OptimizationReport,
  BottleneckAnalysis,
  ConstraintCheckResult,
} from '@/api/mes';
import { apsApi } from '@/api/mes';

import { QUERY_KEYS, queryClient } from '@/lib/reactQuery';

const riskColorMap: Record<string, string> = {
  low: designTokens.colors.success.main,
  medium: designTokens.colors.warning.main,
  high: 'colors.error.main',
  critical: designTokens.colors.purple['500'],
};

const riskLabelMap: Record<string, string> = {
  low: i18n.t('pages.aps_scheduling_page.k0'),
  medium: i18n.t('pages.aps_scheduling_page.k1'),
  high: i18n.t('pages.aps_scheduling_page.k2'),
  critical: i18n.t('pages.aps_scheduling_page.k3'),
};

const ApsSchedulingPage: React.FC = () => {
  const { addNotification } = useNotificationStore();
  const [activeTab, setActiveTab] = useState(0);
  const [strategy, setStrategy] = useState<
    'forward' | 'backward' | 'bidirectional' | 'bottleneck_driven'
  >('forward');
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

  const handleRunSchedule = () => {
    scheduleMutation.mutate({
      strategy,
      overwrite_existing: true,
    });
  };

  const handleSimulate = () => {
    addNotification({
      type: 'info',
      title: i18n.t('pages.aps_scheduling_page.k8'),
      message: i18n.t('pages.aps_scheduling_page.k9'),
    });
  };

  const report = optimizationReport?.data;
  const bottleneck = bottleneckAnalysis?.data;

  return (
    <PageContainer
      title={i18n.t('pages.aps_scheduling_page.aps_2')}
      subtitle={i18n.t('pages.aps_scheduling_page.k10')}
    >
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
        >
          <Tab
            icon={<Brain size={16} />}
            iconPosition='start'
            label={i18n.t('pages.aps_scheduling_page.k11')}
          />
          <Tab
            icon={<BarChart3 size={16} />}
            iconPosition='start'
            label={i18n.t('pages.aps_scheduling_page.k12')}
          />
          <Tab
            icon={<Gauge size={16} />}
            iconPosition='start'
            label={i18n.t('pages.aps_scheduling_page.k13')}
          />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <Box>
          {/* 排程控制面板 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography
                variant='h6'
                sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Brain size={20} />
                {i18n.t('pages.aps_scheduling_page.k3')}
              </Typography>
              <Grid
                container
                spacing={3}
                sx={{ alignItems: 'center' }}
              >
                <Grid size={{ xs: 12, md: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel>{i18n.t('pages.aps_scheduling_page.k14')}</InputLabel>
                    <Select
                      value={strategy}
                      label={i18n.t('pages.aps_scheduling_page.k15')}
                      onChange={(e) => setStrategy(e.target.value as typeof strategy)}
                    >
                      <MenuItem value='forward'>{i18n.t('pages.aps_scheduling_page.k16')}</MenuItem>
                      <MenuItem value='backward'>
                        {i18n.t('pages.aps_scheduling_page.k17')}
                      </MenuItem>
                      <MenuItem value='bidirectional'>
                        {i18n.t('pages.aps_scheduling_page.k18')}
                      </MenuItem>
                      <MenuItem value='bottleneck_driven'>
                        {i18n.t('pages.aps_scheduling_page.k19')}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant='contained'
                      startIcon={<Play size={16} />}
                      onClick={handleRunSchedule}
                      disabled={scheduleMutation.isPending}
                      sx={{ flex: 1 }}
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
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                  {strategy === 'forward' && (
                    <Alert
                      severity='info'
                      sx={{ py: 0.5 }}
                    >
                      {i18n.t('pages.aps_scheduling_page.k6')}
                    </Alert>
                  )}
                  {strategy === 'backward' && (
                    <Alert
                      severity='info'
                      sx={{ py: 0.5 }}
                    >
                      {i18n.t('pages.aps_scheduling_page.k7')}
                    </Alert>
                  )}
                  {strategy === 'bidirectional' && (
                    <Alert
                      severity='info'
                      sx={{ py: 0.5 }}
                    >
                      {i18n.t('pages.aps_scheduling_page.k8')}
                    </Alert>
                  )}
                  {strategy === 'bottleneck_driven' && (
                    <Alert
                      severity='info'
                      sx={{ py: 0.5 }}
                    >
                      {i18n.t('pages.aps_scheduling_page.k9')}
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
              <Typography
                variant='body2'
                sx={{ mt: 1, textAlign: 'center' }}
              >
                {i18n.t('pages.aps_scheduling_page.k10')}
              </Typography>
            </Box>
          )}

          {scheduleResult && (
            <>
              {/* 结果概览 */}
              <Grid
                container
                spacing={2}
                sx={{ mb: 3 }}
              >
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='h4'
                        color='primary'
                      >
                        {scheduleResult.scheduled_orders}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.aps_scheduling_page.k11')}
                      </Typography>
                      <Typography variant='caption'>
                        / {scheduleResult.total_orders} {i18n.t('pages.aps_scheduling_page.k0')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='h4'
                        color='success.main'
                      >
                        {scheduleResult.average_utilization.toFixed(1)}%
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.aps_scheduling_page.k12')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='h4'
                        color='warning.main'
                      >
                        {scheduleResult.total_makespan_hours.toFixed(1)}h
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.aps_scheduling_page.k13')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='h4'
                        color={scheduleResult.tardy_count > 0 ? 'error' : 'success'}
                      >
                        {scheduleResult.tardy_count}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.aps_scheduling_page.k14')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {scheduleResult.warnings.length > 0 && (
                <Alert
                  severity='warning'
                  sx={{ mb: 3 }}
                >
                  {scheduleResult.warnings.map((w, i) => (
                    <div key={i}>{w}</div>
                  ))}
                </Alert>
              )}

              {/* 排程明细表格 */}
              <Card>
                <CardContent>
                  <Typography
                    variant='h6'
                    sx={{ mb: 2 }}
                  >
                    {i18n.t('pages.aps_scheduling_page.k15')}
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant='outlined'
                  >
                    <Table size='small'>
                      <TableHead>
                        <TableRow>
                          <TableCell>{i18n.t('pages.aps_scheduling_page.k21')}</TableCell>
                          <TableCell>{i18n.t('pages.aps_scheduling_page.k22')}</TableCell>
                          <TableCell>{i18n.t('pages.aps_scheduling_page.k23')}</TableCell>
                          <TableCell>{i18n.t('pages.aps_scheduling_page.k24')}</TableCell>
                          <TableCell>{i18n.t('pages.aps_scheduling_page.k25')}</TableCell>
                          <TableCell>{i18n.t('pages.aps_scheduling_page.k26')}</TableCell>
                          <TableCell>{i18n.t('pages.aps_scheduling_page.k27')}</TableCell>
                          <TableCell>{i18n.t('pages.aps_scheduling_page.k28')}</TableCell>
                          <TableCell>{i18n.t('pages.aps_scheduling_page.k29')}</TableCell>
                          <TableCell>{i18n.t('pages.aps_scheduling_page.k30')}</TableCell>
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
                            <TableCell>{item.orderNo}</TableCell>
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
                              )}
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant='determinate'
                                  value={item.feasibility_score}
                                  sx={{ width: 60, height: 6, borderRadius: 3 }}
                                />
                                <Typography variant='caption'>
                                  {item.feasibility_score.toFixed(0)}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size='small'
                                label={riskLabelMap[item.risk_level] || item.risk_level}
                                sx={{
                                  bgcolor:
                                    riskColorMap[item.risk_level] ||
                                    'var(--color-grey-400, #9ca3af)',
                                  color: 'common.white',
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
                <Brain
                  size={64}
                  color='var(--color-grey-300, #d1d5db)'
                  style={{ marginBottom: 16 }}
                />
                <Typography
                  variant='h6'
                  color='text.secondary'
                >
                  {i18n.t('pages.aps_scheduling_page.i18n_16')}.t('pages.aps_scheduling_page.k33')
                </Typography>
                <Typography
                  variant='body2'
                  color='text.secondary'
                  sx={{ mt: 1 }}
                >
                  {i18n.t('pages.aps_scheduling_page.k17')}
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
              <Grid
                container
                spacing={3}
                sx={{ mb: 3 }}
              >
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant='h4'>{report.total_orders}</Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.aps_scheduling_page.k18')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='h4'
                        color='success.main'
                      >
                        {report.on_time_rate.toFixed(1)}%
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.aps_scheduling_page.k19')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant='h4'>
                        {report.average_lead_time_hours.toFixed(1)}h
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.aps_scheduling_page.k20')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='h4'
                        color='warning.main'
                      >
                        {report.unscheduled_orders}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.aps_scheduling_page.k21')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Grid
                container
                spacing={3}
              >
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography
                        variant='h6'
                        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <Gauge size={18} />
                        {i18n.t('pages.aps_scheduling_page.k22')}
                      </Typography>
                      {report.bottleneck_resources.map((r, i) => (
                        <Box
                          key={i}
                          sx={{ mb: 2 }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant='body2'>{r.resource_name}</Typography>
                            <Typography
                              variant='caption'
                              color='text.secondary'
                            >
                              [i18n.t('pages.aps_scheduling_page.k23')]: {r.queue_length} |{' '}
                              {i18n.t('pages.aps_scheduling_page.k24')}
                              {r.utilization_rate.toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant='determinate'
                            value={Math.min(r.utilization_rate, 100)}
                            color={
                              r.utilization_rate > 80
                                ? 'error'
                                : r.utilization_rate > 60
                                  ? 'warning'
                                  : 'success'
                            }
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      ))}
                      {report.bottleneck_resources.length === 0 && (
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {i18n.t('pages.aps_scheduling_page.k25')}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography
                        variant='h6'
                        sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                      >
                        <TrendingUp size={18} />
                        {i18n.t('pages.aps_scheduling_page.k26')}
                      </Typography>
                      {report.improvement_suggestions.map((s, i) => (
                        <Box
                          key={i}
                          sx={{ mb: 2, p: 1.5, bgcolor: 'background.default', borderRadius: 1 }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Chip
                              size='small'
                              label={s.category}
                              color='primary'
                              variant='outlined'
                            />
                            <Typography variant='subtitle2'>{s.title}</Typography>
                          </Box>
                          <Typography
                            variant='body2'
                            color='text.secondary'
                            sx={{ mb: 0.5 }}
                          >
                            {s.description}
                          </Typography>
                          <Typography
                            variant='caption'
                            color='success.main'
                          >
                            [i18n.t('pages.aps_scheduling_page.k27')]: {s.estimated_impact}
                          </Typography>
                        </Box>
                      ))}
                      {report.improvement_suggestions.length === 0 && (
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {i18n.t('pages.aps_scheduling_page.k28')}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          ) : (
            <Alert severity='info'>{i18n.t('pages.aps_scheduling_page.k34')}</Alert>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {bottleneckLoading ? (
            <LoadingSpinner />
          ) : bottleneck ? (
            <>
              <Grid
                container
                spacing={3}
                sx={{ mb: 3 }}
              >
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant='h4'>
                        {bottleneck.throughput_analysis.total_orders}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.aps_scheduling_page.k29')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='h4'
                        color='success.main'
                      >
                        {bottleneck.throughput_analysis.completed_orders}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.aps_scheduling_page.k30')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='h4'
                        color='warning.main'
                      >
                        {bottleneck.throughput_analysis.in_progress_orders}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.aps_scheduling_page.k31')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography
                        variant='h4'
                        color='info.main'
                      >
                        {bottleneck.throughput_analysis.average_cycle_time_hours.toFixed(1)}h
                      </Typography>
                      <Typography
                        variant='body2'
                        color='text.secondary'
                      >
                        {i18n.t('pages.aps_scheduling_page.k32')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Grid
                container
                spacing={3}
              >
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography
                        variant='h6'
                        sx={{ mb: 2 }}
                      >
                        {i18n.t('pages.aps_scheduling_page.vs_33')}
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant='body2'>
                            {i18n.t('pages.aps_scheduling_page.k35')}
                          </Typography>
                          <Typography variant='body2'>
                            {bottleneck.capacity_vs_demand.capacity_utilization.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant='determinate'
                          value={Math.min(bottleneck.capacity_vs_demand.capacity_utilization, 100)}
                          color={
                            bottleneck.capacity_vs_demand.capacity_utilization > 90
                              ? 'error'
                              : 'primary'
                          }
                          sx={{ height: 10, borderRadius: 5 }}
                        />
                      </Box>
                      <Grid
                        container
                        spacing={2}
                      >
                        <Grid size={{ xs: 6 }}>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {i18n.t('pages.aps_scheduling_page.k34')}
                          </Typography>
                          <Typography variant='h6'>
                            {bottleneck.capacity_vs_demand.total_capacity_hours.toFixed(0)}h
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography
                            variant='caption'
                            color='text.secondary'
                          >
                            {i18n.t('pages.aps_scheduling_page.k35')}
                          </Typography>
                          <Typography variant='h6'>
                            {bottleneck.capacity_vs_demand.total_demand_hours.toFixed(0)}h
                          </Typography>
                        </Grid>
                      </Grid>
                      {bottleneck.capacity_vs_demand.capacity_gap_hours > 0 && (
                        <Alert
                          severity='error'
                          sx={{ mt: 2 }}
                        >
                          [i18n.t('pages.aps_scheduling_page.k36')]:{' '}
                          {bottleneck.capacity_vs_demand.capacity_gap_hours.toFixed(1)}{' '}
                          {i18n.t('pages.aps_scheduling_page.k37')}
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card>
                    <CardContent>
                      <Typography
                        variant='h6'
                        sx={{ mb: 2 }}
                      >
                        {i18n.t('pages.aps_scheduling_page.k38')}
                      </Typography>
                      {bottleneck.bottleneck_resources.map((r, i) => (
                        <Box
                          key={i}
                          sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}
                        >
                          <Typography
                            variant='h6'
                            color='text.secondary'
                            sx={{ width: 30 }}
                          >
                            {i + 1}
                          </Typography>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant='body2'>{r.resource_name}</Typography>
                              <Typography variant='caption'>
                                {i18n.t('pages.aps_scheduling_page.k1')}{' '}
                                {r.utilization_rate.toFixed(1)}% |{' '}
                                {i18n.t('pages.aps_scheduling_page.k2')} {r.queue_length}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant='determinate'
                              value={Math.min(r.utilization_rate, 100)}
                              color={r.utilization_rate > 80 ? 'error' : 'primary'}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                          </Box>
                        </Box>
                      ))}
                      {bottleneck.bottleneck_resources.length === 0 && (
                        <Typography
                          variant='body2'
                          color='text.secondary'
                        >
                          {i18n.t('pages.aps_scheduling_page.k39')}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          ) : (
            <Alert severity='info'>{i18n.t('pages.aps_scheduling_page.k36')}</Alert>
          )}
        </Box>
      )}

      {/* 详情弹窗 */}
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
    </PageContainer>
  );
};

export default ApsSchedulingPage;
