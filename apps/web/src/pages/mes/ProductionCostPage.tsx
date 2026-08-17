import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Typography,
} from '@mui/material';
import i18n from '@/i18n';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { productionCostApi, type WorkOrderCostResult } from '../../api/mes/productionCost';
import { useQuery } from '@tanstack/react-query';
import { useNotificationStore } from '@/store/notificationStore';
import { PageContainer } from '@/components/common';
import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';

const ProductionCostPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [workOrderId, setWorkOrderId] = useState('');
  const addNotification = useNotificationStore((state) => state.addNotification);
  const periodCostReport = useQuery({
    queryKey: [...QUERY_KEYS.AD_HOC.PERIODCOSTREPORT_BASE, periodType],
    queryFn: () => productionCostApi.getPeriodCostReport({ period_type: periodType }),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const costTrend = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.COSTTREND_BASE,
    queryFn: () => productionCostApi.getCostTrend({ period_type: 'month' }),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const costForecast = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.COSTFORECAST_BASE,
    queryFn: () => productionCostApi.getCostForecast({ months: 3 }),

    staleTime: CACHE_DURATIONS.MEDIUM,
  });
  const [workOrderCost, setWorkOrderCost] = useState<WorkOrderCostResult | null>(null);
  const [loadingWorkOrder, setLoadingWorkOrder] = useState(false);
  const handleQueryWorkOrderCost = async () => {
    if (!workOrderId.trim()) {
      addNotification({
        title: i18n.t('mes.production_cost_page.k1'),
        message: i18n.t('mes.production_cost_page.id_0'),
        type: 'warning',
      });
      return;
    }
    setLoadingWorkOrder(true);
    try {
      const data = await productionCostApi.calculateWorkOrderCost(workOrderId.trim());
      setWorkOrderCost(data.data);
      addNotification({
        title: i18n.t('mes.production_cost_page.k3'),
        message: i18n.t('mes.production_cost_page.k2'),
        type: 'success',
      });
    } catch {
      addNotification({
        title: i18n.t('mes.production_cost_page.k5'),
        message: i18n.t('mes.production_cost_page.k4'),
        type: 'error',
      });
    } finally {
      setLoadingWorkOrder(false);
    }
  };
  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return (
          <TrendingUp
            style={{ color: 'error.500' }}
            size={20}
          />
        );
      case 'down':
        return (
          <TrendingDown
            style={{ color: 'success.500' }}
            size={20}
          />
        );
      default:
        return (
          <Minus
            style={{ color: 'grey.500' }}
            size={20}
          />
        );
    }
  };
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(value);
  };
  const reportData = periodCostReport.data?.data;
  const trendData = costTrend.data?.data;
  const forecastData = costForecast.data?.data;
  return (
    <PageContainer title={i18n.t('mes.production_cost_page.k6')}>
      <Box sx={{ p: 3 }}>
        <Typography
          variant='h4'
          sx={{ mb: 4 }}
        >
          {i18n.t('pages.production_cost_page.k0')}
        </Typography>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 4 }}
        >
          <Tab
            label={i18n.t('mes.production_cost_page.k7')}
            icon={<BarChart3 size={20} />}
          />
          <Tab
            label={i18n.t('mes.production_cost_page.k8')}
            icon={<TrendingUp size={20} />}
          />
          <Tab
            label={i18n.t('mes.production_cost_page.k9')}
            icon={<PieChart size={20} />}
          />
          <Tab
            label={i18n.t('mes.production_cost_page.k10')}
            icon={<DollarSign size={20} />}
          />
        </Tabs>
        {activeTab === 0 && reportData && (
          <Grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
            <Grid sx={{ gridColumn: 'span 3' }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <DollarSign style={{ fontSize: 40, color: 'teal.500', marginBottom: 8 }} />
                  <Typography variant='h5'>{formatCurrency(reportData.total_cost)}</Typography>
                  <Typography
                    variant='body2'
                    color='textSecondary'
                  >
                    {i18n.t('pages.production_cost_page.k1')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Card sx={{ mt: 3 }}>
              <CardHeader title={i18n.t('mes.production_cost_page.k11')} />
              <CardContent>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{i18n.t('mes.production_cost_page.k12')}</TableCell>
                      <TableCell>{i18n.t('mes.production_cost_page.k13')}</TableCell>
                      <TableCell>{i18n.t('mes.production_cost_page.k14')}</TableCell>
                      <TableCell>{i18n.t('mes.production_cost_page.k15')}</TableCell>
                      <TableCell>{i18n.t('mes.production_cost_page.k16')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.cost_by_product.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell>{item.product_code}</TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell>{formatCurrency(item.total_cost)}</TableCell>
                        <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${item.percentage}%`}
                            size='small'
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card sx={{ mt: 3 }}>
              <CardHeader title={i18n.t('mes.production_cost_page.k17')} />
              <CardContent>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{i18n.t('mes.production_cost_page.k18')}</TableCell>
                      <TableCell>{i18n.t('mes.production_cost_page.k19')}</TableCell>
                      <TableCell>{i18n.t('mes.production_cost_page.k20')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.cost_by_workshop.map((item) => (
                      <TableRow key={item.workshop_id}>
                        <TableCell>{item.workshop_name}</TableCell>
                        <TableCell>{formatCurrency(item.total_cost)}</TableCell>
                        <TableCell>
                          <Chip
                            label={`${item.percentage}%`}
                            size='small'
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>
        )}
        {activeTab === 1 && trendData && (
          <Card>
            <CardHeader title={i18n.t('mes.production_cost_page.k21')} />
            <CardContent>
              <Grid sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <Grid>
                  <Chip
                    label={`${i18n.t('pages.production_cost_page.k0')}${trendData.overall_trend === 'up' ? i18n.t('mes.production_cost_page.k24') : trendData.overall_trend === 'down' ? i18n.t('mes.production_cost_page.k23') : i18n.t('mes.production_cost_page.k22')}`}
                    icon={getTrendIcon(trendData.overall_trend)}
                    color={
                      trendData.overall_trend === 'up'
                        ? 'error'
                        : trendData.overall_trend === 'down'
                          ? 'success'
                          : 'default'
                    }
                  />
                </Grid>
                <Grid>
                  <Chip
                    label={`${i18n.t('pages.production_cost_page.k1')}${trendData.avg_change_rate}%`}
                    size='small'
                  />
                </Grid>
              </Grid>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>{i18n.t('mes.production_cost_page.k25')}</TableCell>
                    <TableCell>{i18n.t('mes.production_cost_page.k26')}</TableCell>
                    <TableCell>{i18n.t('mes.production_cost_page.k27')}</TableCell>
                    <TableCell>{i18n.t('mes.production_cost_page.k28')}</TableCell>
                    <TableCell>{i18n.t('mes.production_cost_page.k29')}</TableCell>
                    <TableCell>{i18n.t('mes.production_cost_page.k30')}</TableCell>
                    <TableCell>{i18n.t('mes.production_cost_page.k31')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {trendData.trend_data.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.period}</TableCell>
                      <TableCell>{formatCurrency(item.total_cost)}</TableCell>
                      <TableCell>{formatCurrency(item.material_cost)}</TableCell>
                      <TableCell>{formatCurrency(item.labor_cost)}</TableCell>
                      <TableCell>{formatCurrency(item.overhead_cost)}</TableCell>
                      <TableCell>{getTrendIcon(item.trend_direction)}</TableCell>
                      <TableCell>
                        <Chip
                          label={`${item.change_rate}%`}
                          size='small'
                          color={
                            item.change_rate > 0
                              ? 'error'
                              : item.change_rate < 0
                                ? 'success'
                                : 'default'
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {activeTab === 2 && forecastData && (
          <Card>
            <CardHeader title={i18n.t('mes.production_cost_page.k32')} />
            <CardContent>
              <Grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
                <Grid sx={{ gridColumn: 'span 3' }}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <DollarSign style={{ fontSize: 40, color: 'warning.500', marginBottom: 8 }} />
                      <Typography variant='h5'>
                        {formatCurrency(forecastData.forecast_total)}
                      </Typography>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        {i18n.t('pages.production_cost_page.k2')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid sx={{ gridColumn: 'span 3' }}>
                  <Card>
                    <CardContent>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        {i18n.t('pages.production_cost_page.k3')}
                      </Typography>
                      <Typography variant='h5'>
                        {formatCurrency(forecastData.forecast_material)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid sx={{ gridColumn: 'span 3' }}>
                  <Card>
                    <CardContent>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        {i18n.t('pages.production_cost_page.k4')}
                      </Typography>
                      <Typography variant='h5'>
                        {formatCurrency(forecastData.forecast_labor)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid sx={{ gridColumn: 'span 3' }}>
                  <Card>
                    <CardContent>
                      <Typography
                        variant='body2'
                        color='textSecondary'
                      >
                        {i18n.t('pages.production_cost_page.k5')}
                      </Typography>
                      <Typography variant='h5'>
                        {formatCurrency(forecastData.forecast_overhead)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
              <Box sx={{ mt: 4 }}>
                <Typography variant='subtitle1'>
                  [i18n.t('pages.production_cost_page.k6')]: {forecastData.forecast_period}
                </Typography>
                <Typography variant='subtitle1'>
                  [i18n.t('pages.production_cost_page.k7')]:{' '}
                  {formatCurrency(forecastData.confidence_interval[0])} -{' '}
                  {formatCurrency(forecastData.confidence_interval[1])}
                </Typography>
                <Typography variant='subtitle1'>
                  {i18n.t('pages.production_cost_page.k0')}
                </Typography>
                <Typography variant='subtitle1'>
                  [i18n.t('pages.production_cost_page.k8')]: {forecastData.seasonality_factor}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
        {activeTab === 3 && (
          <Card>
            <CardHeader title={i18n.t('mes.production_cost_page.k33')} />
            <CardContent>
              <Grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2, mb: 4 }}>
                <Grid sx={{ gridColumn: 'span 6' }}>
                  <Input
                    placeholder={i18n.t('mes.production_cost_page.id_34')}
                    value={workOrderId}
                    onChange={(e) => setWorkOrderId(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid sx={{ gridColumn: 'span 2' }}>
                  <Button
                    variant='contained'
                    onClick={handleQueryWorkOrderCost}
                    disabled={loadingWorkOrder}
                  >
                    {i18n.t('pages.production_cost_page.k9')}
                  </Button>
                </Grid>
              </Grid>
              {workOrderCost && (
                <>
                  <Grid
                    sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3, mb: 4 }}
                  >
                    <Grid sx={{ gridColumn: 'span 3' }}>
                      <Card>
                        <CardContent>
                          <Typography
                            variant='body2'
                            color='textSecondary'
                          >
                            {i18n.t('pages.production_cost_page.k10')}
                          </Typography>
                          <Typography variant='h6'>{workOrderCost.work_order_no}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid sx={{ gridColumn: 'span 3' }}>
                      <Card>
                        <CardContent>
                          <Typography
                            variant='body2'
                            color='textSecondary'
                          >
                            {i18n.t('pages.production_cost_page.k11')}
                          </Typography>
                          <Typography variant='h6'>{workOrderCost.production_order_no}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid sx={{ gridColumn: 'span 3' }}>
                      <Card>
                        <CardContent>
                          <Typography
                            variant='body2'
                            color='textSecondary'
                          >
                            {i18n.t('pages.production_cost_page.k12')}
                          </Typography>
                          <Typography variant='h6'>{workOrderCost.produced_qty}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid sx={{ gridColumn: 'span 3' }}>
                      <Card>
                        <CardContent>
                          <Typography
                            variant='body2'
                            color='textSecondary'
                          >
                            {i18n.t('pages.production_cost_page.k13')}
                          </Typography>
                          <Typography variant='h6'>
                            {formatCurrency(workOrderCost.unit_cost)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                  <Card sx={{ mt: 3 }}>
                    <CardHeader title={i18n.t('mes.production_cost_page.k35')} />
                    <CardContent>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>{i18n.t('mes.production_cost_page.k36')}</TableCell>
                            <TableCell>{i18n.t('mes.production_cost_page.k37')}</TableCell>
                            <TableCell>{i18n.t('mes.production_cost_page.k38')}</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>{i18n.t('mes.production_cost_page.k39')}</TableCell>
                            <TableCell>{formatCurrency(workOrderCost.material_cost)}</TableCell>
                            <TableCell>
                              {(
                                (workOrderCost.material_cost / workOrderCost.total_cost) *
                                100
                              ).toFixed(2)}
                              %
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>{i18n.t('mes.production_cost_page.k40')}</TableCell>
                            <TableCell>{formatCurrency(workOrderCost.labor_cost)}</TableCell>
                            <TableCell>
                              {(
                                (workOrderCost.labor_cost / workOrderCost.total_cost) *
                                100
                              ).toFixed(2)}
                              %
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>{i18n.t('mes.production_cost_page.k41')}</TableCell>
                            <TableCell>{formatCurrency(workOrderCost.overhead_cost)}</TableCell>
                            <TableCell>
                              {(
                                (workOrderCost.overhead_cost / workOrderCost.total_cost) *
                                100
                              ).toFixed(2)}
                              %
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <strong>{i18n.t('mes.production_cost_page.k42')}</strong>
                            </TableCell>
                            <TableCell>
                              <strong>{formatCurrency(workOrderCost.total_cost)}</strong>
                            </TableCell>
                            <TableCell>
                              <strong>100%</strong>
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  {workOrderCost.cost_breakdown && workOrderCost.cost_breakdown.length > 0 && (
                    <Card sx={{ mt: 3 }}>
                      <CardHeader title={i18n.t('mes.production_cost_page.k43')} />
                      <CardContent>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>{i18n.t('mes.production_cost_page.k44')}</TableCell>
                              <TableCell>{i18n.t('mes.production_cost_page.k45')}</TableCell>
                              <TableCell>{i18n.t('mes.production_cost_page.k46')}</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {workOrderCost.cost_breakdown.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.category}</TableCell>
                                <TableCell>{formatCurrency(item.amount)}</TableCell>
                                <TableCell>{item.percentage}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
        {activeTab === 0 && (
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Grid sx={{ display: 'flex', gap: 2 }}>
                <Grid>
                  <Calendar
                    style={{ marginRight: 8 }}
                    size={20}
                  />
                  <Select
                    value={periodType}
                    onChange={(e) => setPeriodType(e.target.value as 'month' | 'quarter' | 'year')}
                    sx={{ minWidth: 120 }}
                  >
                    <option value='month'>{i18n.t('mes.production_cost_page.k47')}</option>
                    <option value='quarter'>{i18n.t('mes.production_cost_page.k48')}</option>
                    <option value='year'>{i18n.t('mes.production_cost_page.k49')}</option>
                  </Select>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>
    </PageContainer>
  );
};
export default ProductionCostPage;
