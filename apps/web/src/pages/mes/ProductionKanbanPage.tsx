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
import { PageContainer } from '@/components/common/PageContainerV2';
import React, { useState, useEffect, useCallback } from 'react';
import { mesApi } from '@/api/mes';
import type { ProductionKanbanData } from '@/api/mes';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
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
import { apiLogger } from '@/utils/logger';
import { designTokens } from '@/theme/tokens';
const ct = designTokens.colors;

const ProductionKanbanPage: React.FC = () => {
  const [kanbanData, setKanbanData] = useState<ProductionKanbanData | null>(null);
  const [loading, setLoading] = useState(true);

  const { addNotification } = useAppStore();

  const loadKanbanData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await mesApi.kanban.getDashboard();
      if (response.success && response.data) {
        setKanbanData(response.data);
      }
    } catch (error: unknown) {
      apiLogger.error('加载生产看板数据失败:', error);
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载生产看板数据',
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadKanbanData();
    const interval = setInterval(() => {
      loadKanbanData();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadKanbanData]);

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      running: 'success.main',
      idle: 'grey.500',
      maintenance: 'warning.main',
      error: 'error.main',
      in_progress: 'primary.main',
      pending: 'text.secondary',
      completed: 'success.main',
    };
    return colorMap[status] || 'text.secondary';
  };

  const getStatusText = (status: string) => {
    const textMap: Record<string, string> = {
      running: '运行中',
      idle: '空闲',
      maintenance: '维护中',
      error: '故障',
      in_progress: '进行中',
      pending: '待开始',
      completed: '已完成',
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
                  <Typography variant='body2'>总订单数</Typography>
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
                  <Typography variant='body2'>进行中</Typography>
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
                  <Typography variant='body2'>已完成</Typography>
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
                  <Typography variant='body2'>今日产量</Typography>
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
                  <Typography variant='body2'>合格率</Typography>
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
                  <Typography variant='body2'>OEE</Typography>
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
                  订单进度
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {orderProgress.length === 0 ? (
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}
                  >
                    暂无订单数据
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
                              计划: {order.planned_quantity} / 完成: {order.completed_quantity}
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
                  工作站状态
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {workstationStatus.length === 0 ? (
                  <Typography
                    variant='body2'
                    sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}
                  >
                    暂无工作站数据
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
                            {ws.current_product || '空闲'}
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
                  质量趋势
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
                      <TableCell>日期</TableCell>
                      <TableCell align='right'>总产量</TableCell>
                      <TableCell align='right'>合格量</TableCell>
                      <TableCell align='right'>合格率</TableCell>
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
                          暂无质量数据
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
                  设备状态
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
                      <TableCell>设备编码</TableCell>
                      <TableCell>设备名称</TableCell>
                      <TableCell align='center'>状态</TableCell>
                      <TableCell align='right'>OEE</TableCell>
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
                          暂无设备数据
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
