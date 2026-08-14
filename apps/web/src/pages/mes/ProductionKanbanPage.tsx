import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from '@mui/material';
import { PageContainer } from '@/components/common';
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {QUERY_KEYS, CACHE_DURATIONS} from '@/lib/reactQuery';
import { mesApi } from '@/api/mes';
import type { ProductionKanbanData } from '@/api/mes';
import { LoadingSpinner } from '@topems/shared-components';
import {
  Factory,
  Package,
  CheckCircle,
  TrendingUp,
  Gauge,
  Activity,
  Monitor,
  Wrench,
} from 'lucide-react';
import { designTokens } from '@/theme/tokens';

const ct= designTokens.colors;

const ProductionKanbanPage: React.FC = () => {
  const { t } = useTranslation();
  const { data: kanbanData, isPending: loading} = useQuery<ProductionKanbanData | null>({
    queryKey: QUERY_KEYS.MES.KANBAN_DASHBOARD,
    queryFn: async () => {
      const response = await mesApi.kanban.getDashboard();
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    },
    refetchInterval: 60000,
  
      staleTime: CACHE_DURATIONS.MEDIUM,});

  const statusColorMap = useMemo<Record<string, string>>(
    () => ({
      running: 'success.main',
      idle: 'grey.500',
      maintenance: 'warning.main',
      error: 'error.main',
      in_progress: 'primary.main',
      pending: 'text.secondary',
      completed: 'success.main',
    }),
    []
  );

  const getStatusColor = (status: string) => statusColorMap[status] || 'text.secondary';

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      running: t('mes.production_kanban_page.status_running'),
      idle: t('mes.production_kanban_page.status_idle'),
      maintenance: t('mes.production_kanban_page.status_maintenance'),
      error: t('mes.production_kanban_page.status_error'),
      in_progress: t('mes.production_kanban_page.status_in_progress'),
      pending: t('mes.production_kanban_page.status_pending'),
      completed: t('mes.production_kanban_page.status_completed'),
    };
    return textMap[status] || status;
  };

  if (loading) return <LoadingSpinner />;
  if (!kanbanData) return null;

  const {
    summary,
    order_progress: orderProgress = [],
    workstation_status: workstationStatus = [],
    quality_trend: qualityTrend = [],
    equipment_status: equipmentStatus = [],
  } = kanbanData;

  if (!summary) return null;

  return (
    <PageContainer
      autoTitle
      autoBreadcrumbs
      headerProps={{
        pageIcon: <Monitor style={{ width: 20, height: 20 }} />,
        pageGradient: `linear-gradient(135deg, ${ct.primary.main} 0%, ${ct.primary.dark} 100%)`,
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Grid
          container
          spacing={2}
        >
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Factory size={24} />
                  <Typography variant='body2'>
                    {t('mes.production_kanban_page.stat_total_orders')}
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {summary.total_orders}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card sx={{ bgcolor: 'info.light', color: 'info.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Activity size={24} />
                  <Typography variant='body2'>
                    {t('mes.production_kanban_page.stat_in_progress')}
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {summary.in_progress_orders}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card sx={{ bgcolor: 'success.light', color: 'success.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle size={24} />
                  <Typography variant='body2'>
                    {t('mes.production_kanban_page.stat_completed')}
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {summary.completed_orders}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card sx={{ bgcolor: 'warning.light', color: 'warning.contrastText' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Package size={24} />
                  <Typography variant='body2'>
                    {t('mes.production_kanban_page.stat_today_output')}
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {summary.today_output}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card sx={{ bgcolor: ct.secondary[100], color: 'secondary.700' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <TrendingUp size={24} />
                  <Typography variant='body2'>
                    {t('mes.production_kanban_page.stat_pass_rate')}
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {summary.pass_rate.toFixed(2)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card sx={{ bgcolor: 'secondary.100', color: ct.secondary[700] }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Gauge size={24} />
                  <Typography variant='body2'>
                    {t('mes.production_kanban_page.stat_oee')}
                  </Typography>
                </Box>
                <Typography
                  variant='h4'
                  sx={{ fontWeight: 700 }}
                >
                  {summary.oee.toFixed(2)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Grid
        container
        spacing={3}
      >
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Package
                  size={20}
                  color='primary.main'
                />
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {t('mes.production_kanban_page.section_progress')}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {orderProgress.length === 0 ? (
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}
                  >
                    {t('mes.production_kanban_page.no_order_data')}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {orderProgress.map((order) => (
                      <Box
                        key={order.order_id}
                        sx={{
                          p: 2,
                          bgcolor: 'grey.50',
                          borderRadius: 1,
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 1,
                          }}
                        >
                          <Box>
                            <Typography
                              variant='subtitle2'
                              sx={{ fontWeight: 600 }}
                            >
                              {order.order_number} - {order.product_name}
                            </Typography>
                            <Typography
                              variant='body2'
                              sx={{ color: 'text.secondary' }}
                            >
                              {t('mes.production_kanban_page.label_planned')}:{' '}
                              {order.plannedQuantity} /{' '}
                              {t('mes.production_kanban_page.label_completed')}:{' '}
                              {order.completed_quantity}
                            </Typography>
                          </Box>
                          <Chip
                            size='small'
                            label={getStatusText(order.status)}
                            sx={{
                              bgcolor:
                                order.status === 'completed'
                                  ? 'success.lighter'
                                  : order.status === 'in_progress'
                                    ? 'primary.lighter'
                                    : 'grey.100',
                              color:
                                order.status === 'completed'
                                  ? 'success.dark'
                                  : order.status === 'in_progress'
                                    ? 'primary.dark'
                                    : 'text.secondary',
                              fontWeight: 500,
                            }}
                          />
                        </Box>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <LinearProgress
                              variant='determinate'
                              value={order.progress}
                              sx={{
                                height: 8,
                                borderRadius: 4,
                                bgcolor: 'grey.200',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: order.progress >= 100 ? 'success.main' : 'primary.main',
                                },
                              }}
                            />
                          </Box>
                          <Typography
                            variant='body2'
                            sx={{ fontWeight: 600, minWidth: 50, textAlign: 'right' }}
                          >
                            {order.progress.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Monitor
                  size={20}
                  color='primary.main'
                />
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {t('mes.production_kanban_page.section_workstation_status')}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {workstationStatus.length === 0 ? (
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}
                  >
                    {t('mes.production_kanban_page.no_workstation_data')}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {workstationStatus.map((ws) => (
                      <Box
                        key={ws.work_station_id}
                        sx={{
                          p: 1.5,
                          border: 1,
                          borderColor: 'grey.200',
                          borderRadius: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Box>
                          <Typography
                            variant='subtitle2'
                            sx={{ fontWeight: 600 }}
                          >
                            {ws.work_station_name}
                          </Typography>
                          <Typography
                            variant='caption'
                            sx={{ color: 'text.secondary' }}
                          >
                            {ws.current_product || t('mes.production_kanban_page.status_idle')}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: getStatusColor(ws.status),
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUp
                  size={20}
                  color='success.main'
                />
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {t('mes.production_kanban_page.section_quality_trend')}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>{t('mes.production_kanban_page.col_date')}</TableCell>
                      <TableCell align='right'>
                        {t('mes.production_kanban_page.col_total_output')}
                      </TableCell>
                      <TableCell align='right'>
                        {t('mes.production_kanban_page.col_qualified')}
                      </TableCell>
                      <TableCell align='right'>
                        {t('mes.production_kanban_page.col_pass_rate')}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {qualityTrend.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          align='center'
                          sx={{ py: 4, color: 'text.secondary' }}
                        >
                          {t('mes.production_kanban_page.no_quality_data')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      qualityTrend.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.date}</TableCell>
                          <TableCell align='right'>{item.total_quantity}</TableCell>
                          <TableCell
                            align='right'
                            sx={{ color: 'success.main' }}
                          >
                            {item.good_quantity}
                          </TableCell>
                          <TableCell align='right'>
                            <Chip
                              size='small'
                              label={`${item.pass_rate.toFixed(2)}%`}
                              sx={{
                                bgcolor:
                                  item.pass_rate >= 95
                                    ? 'success.lighter'
                                    : item.pass_rate >= 90
                                      ? 'warning.lighter'
                                      : 'error.lighter',
                                color:
                                  item.pass_rate >= 95
                                    ? 'success.dark'
                                    : item.pass_rate >= 90
                                      ? 'warning.dark'
                                      : 'error.dark',
                                fontWeight: 500,
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Wrench
                  size={20}
                  color='warning.main'
                />
                <Typography
                  variant='h6'
                  sx={{ fontWeight: 600 }}
                >
                  {t('mes.production_kanban_page.section_equipment_status')}
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <TableContainer
                component={Paper}
                variant='outlined'
              >
                <Table size='small'>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>{t('mes.production_kanban_page.col_equipment_code')}</TableCell>
                      <TableCell>{t('mes.production_kanban_page.col_equipment_name')}</TableCell>
                      <TableCell align='center'>
                        {t('mes.production_kanban_page.col_status')}
                      </TableCell>
                      <TableCell align='right'>{t('mes.production_kanban_page.col_oee')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {equipmentStatus.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          align='center'
                          sx={{ py: 4, color: 'text.secondary' }}
                        >
                          {t('mes.production_kanban_page.no_equipment_data')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      equipmentStatus.map((eq) => (
                        <TableRow key={eq.equipment_id}>
                          <TableCell>{eq.equipment_code}</TableCell>
                          <TableCell>{eq.equipment_name}</TableCell>
                          <TableCell align='center'>
                            <Chip
                              size='small'
                              label={getStatusText(eq.status)}
                              sx={{
                                bgcolor:
                                  eq.status === 'running'
                                    ? 'success.lighter'
                                    : eq.status === 'idle'
                                      ? 'grey.100'
                                      : eq.status === 'maintenance'
                                        ? 'warning.lighter'
                                        : 'error.lighter',
                                color:
                                  eq.status === 'running'
                                    ? 'success.dark'
                                    : eq.status === 'idle'
                                      ? 'text.secondary'
                                      : eq.status === 'maintenance'
                                        ? 'warning.dark'
                                        : 'error.dark',
                                fontWeight: 500,
                              }}
                            />
                          </TableCell>
                          <TableCell align='right'>
                            {eq.oee ? `${eq.oee.toFixed(2)}%` : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default ProductionKanbanPage;
