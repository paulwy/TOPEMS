import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import i18n from '@/i18n';
import { TrendingUp, TrendingDown, Minus, DollarSign, BarChart3, PieChart } from 'lucide-react';
import { productionCostApi, type WorkOrderCostResult } from '@/api/mes/productionCost';
import { useNotificationStore } from '@/store/notificationStore';
import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  ChartConfig,
  DataTable,
  StatCard,
  TabItem,
  TimeRangeOption,
} from '@/components/templates/StatsPageTemplate';
import { designTokens } from '@topems/tokens';

const ct = designTokens.colors;

type TabValue = 'period' | 'trend' | 'forecast' | 'work-order';

const ProductionCostPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabValue>('period');
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [workOrderId, setWorkOrderId] = useState('');
  const [workOrderCost, setWorkOrderCost] = useState<WorkOrderCostResult | null>(null);
  const [loadingWorkOrder, setLoadingWorkOrder] = useState(false);

  const queryClient = useQueryClient();
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
            color={ct.error.main}
            size={20}
          />
        );
      case 'down':
        return (
          <TrendingDown
            color={ct.success.main}
            size={20}
          />
        );
      default:
        return (
          <Minus
            color={ct.grey[500]}
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

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.PERIODCOSTREPORT_BASE,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.COSTTREND_BASE,
      exact: false,
      refetchType: 'active',
    });
    queryClient.invalidateQueries({
      queryKey: QUERY_KEYS.AD_HOC.COSTFORECAST_BASE,
      exact: false,
      refetchType: 'active',
    });
  }, [queryClient]);

  const reportData = periodCostReport.data?.data;
  const trendData = costTrend.data?.data;
  const forecastData = costForecast.data?.data;

  const tabs: TabItem[] = useMemo(
    () => [
      {
        value: 'period',
        label: i18n.t('mes.production_cost_page.k7'),
        icon: <BarChart3 size={20} />,
      },
      {
        value: 'trend',
        label: i18n.t('mes.production_cost_page.k8'),
        icon: <TrendingUp size={20} />,
      },
      {
        value: 'forecast',
        label: i18n.t('mes.production_cost_page.k9'),
        icon: <PieChart size={20} />,
      },
      {
        value: 'work-order',
        label: i18n.t('mes.production_cost_page.k10'),
        icon: <DollarSign size={20} />,
      },
    ],
    []
  );

  const timeRangeOptions: TimeRangeOption[] = useMemo(
    () => [
      { label: i18n.t('mes.production_cost_page.k47'), value: 'month' },
      { label: i18n.t('mes.production_cost_page.k48'), value: 'quarter' },
      { label: i18n.t('mes.production_cost_page.k49'), value: 'year' },
    ],
    []
  );

  const statCards = useMemo<StatCard[]>(() => {
    switch (activeTab) {
      case 'period':
        if (!reportData) return [];
        return [
          {
            id: 'total-cost',
            title: i18n.t('pages.production_cost_page.k1'),
            value: formatCurrency(reportData.total_cost),
            icon: (
              <DollarSign
                size={20}
                color={ct.teal.main}
              />
            ),
            color: 'primary',
          },
        ];

      case 'trend':
        if (!trendData) return [];
        return [
          {
            id: 'overall-trend',
            title: i18n.t('pages.production_cost_page.k0'),
            value:
              trendData.overall_trend === 'up'
                ? i18n.t('mes.production_cost_page.k24')
                : trendData.overall_trend === 'down'
                  ? i18n.t('mes.production_cost_page.k23')
                  : i18n.t('mes.production_cost_page.k22'),
            icon: getTrendIcon(trendData.overall_trend),
            color:
              trendData.overall_trend === 'up'
                ? 'error'
                : trendData.overall_trend === 'down'
                  ? 'success'
                  : undefined,
          },
          {
            id: 'avg-change-rate',
            title: i18n.t('mes.production_cost_page.k28'),
            value: `${trendData.avg_change_rate}%`,
          },
        ];

      case 'forecast':
        if (!forecastData) return [];
        return [
          {
            id: 'forecast-total',
            title: i18n.t('pages.production_cost_page.k2'),
            value: formatCurrency(forecastData.forecast_total),
            icon: (
              <DollarSign
                size={20}
                color={ct.warning.main}
              />
            ),
            color: 'warning',
          },
          {
            id: 'forecast-material',
            title: i18n.t('pages.production_cost_page.k3'),
            value: formatCurrency(forecastData.forecast_material),
            color: 'info',
          },
          {
            id: 'forecast-labor',
            title: i18n.t('pages.production_cost_page.k4'),
            value: formatCurrency(forecastData.forecast_labor),
            color: 'success',
          },
          {
            id: 'forecast-overhead',
            title: i18n.t('pages.production_cost_page.k5'),
            value: formatCurrency(forecastData.forecast_overhead),
            color: 'secondary',
          },
        ];

      case 'work-order':
      default:
        return [];
    }
  }, [activeTab, reportData, trendData, forecastData]);

  const charts = useMemo<ChartConfig[]>(() => {
    switch (activeTab) {
      case 'period':
        if (!reportData) return [];
        return [
          {
            id: 'cost-by-product',
            title: i18n.t('mes.production_cost_page.k11'),
            type: 'pie',
            dataKey: 'total_cost',
            nameKey: 'product_name',
            data: reportData.cost_by_product.map((item) => ({
              name: item.product_name,
              value: item.total_cost,
            })),
          },
          {
            id: 'cost-by-workshop',
            title: i18n.t('mes.production_cost_page.k17'),
            type: 'bar',
            dataKey: 'total_cost',
            nameKey: 'workshop_name',
            data: reportData.cost_by_workshop.map((item) => ({
              name: item.workshop_name,
              value: item.total_cost,
            })),
          },
        ];

      case 'trend':
        if (!trendData) return [];
        return [
          {
            id: 'cost-trend',
            title: i18n.t('mes.production_cost_page.k21'),
            type: 'line',
            dataKey: 'total_cost',
            nameKey: 'period',
            data: trendData.trend_data.map((item) => ({
              name: item.period,
              value: item.total_cost,
            })),
          },
        ];

      case 'forecast':
        if (!forecastData) return [];
        return [
          {
            id: 'forecast-breakdown',
            title: i18n.t('mes.production_cost_page.k32'),
            type: 'bar',
            dataKey: 'value',
            nameKey: 'name',
            data: [
              {
                name: i18n.t('pages.production_cost_page.k3'),
                value: forecastData.forecast_material,
              },
              {
                name: i18n.t('pages.production_cost_page.k4'),
                value: forecastData.forecast_labor,
              },
              {
                name: i18n.t('pages.production_cost_page.k5'),
                value: forecastData.forecast_overhead,
              },
            ],
          },
        ];

      default:
        return [];
    }
  }, [activeTab, reportData, trendData, forecastData]);

  const tables = useMemo<DataTable[]>(() => {
    switch (activeTab) {
      case 'period':
        if (!reportData) return [];
        return [
          {
            id: 'cost-by-product-table',
            title: i18n.t('mes.production_cost_page.k11'),
            columns: [
              {
                id: 'product_code',
                label: i18n.t('mes.production_cost_page.k12'),
                field: 'product_code',
              },
              {
                id: 'product_name',
                label: i18n.t('mes.production_cost_page.k13'),
                field: 'product_name',
              },
              {
                id: 'total_cost',
                label: i18n.t('mes.production_cost_page.k14'),
                field: 'total_cost',
                render: (value) => formatCurrency(value as number),
              },
              {
                id: 'unit_cost',
                label: i18n.t('mes.production_cost_page.k15'),
                field: 'unit_cost',
                render: (value) => formatCurrency(value as number),
              },
              {
                id: 'percentage',
                label: i18n.t('mes.production_cost_page.k16'),
                field: 'percentage',
                align: 'center',
                render: (value) => (
                  <Chip
                    label={`${value}%`}
                    size='small'
                  />
                ),
              },
            ],
            data: reportData.cost_by_product as unknown as Record<string, unknown>[],
          },
          {
            id: 'cost-by-workshop-table',
            title: i18n.t('mes.production_cost_page.k17'),
            columns: [
              {
                id: 'workshop_name',
                label: i18n.t('mes.production_cost_page.k18'),
                field: 'workshop_name',
              },
              {
                id: 'total_cost',
                label: i18n.t('mes.production_cost_page.k19'),
                field: 'total_cost',
                render: (value) => formatCurrency(value as number),
              },
              {
                id: 'percentage',
                label: i18n.t('mes.production_cost_page.k20'),
                field: 'percentage',
                align: 'center',
                render: (value) => (
                  <Chip
                    label={`${value}%`}
                    size='small'
                  />
                ),
              },
            ],
            data: reportData.cost_by_workshop as unknown as Record<string, unknown>[],
          },
        ];

      case 'trend':
        if (!trendData) return [];
        return [
          {
            id: 'trend-table',
            title: i18n.t('mes.production_cost_page.k21'),
            columns: [
              {
                id: 'period',
                label: i18n.t('mes.production_cost_page.k25'),
                field: 'period',
              },
              {
                id: 'total_cost',
                label: i18n.t('mes.production_cost_page.k26'),
                field: 'total_cost',
                render: (value) => formatCurrency(value as number),
              },
              {
                id: 'material_cost',
                label: i18n.t('mes.production_cost_page.k27'),
                field: 'material_cost',
                render: (value) => formatCurrency(value as number),
              },
              {
                id: 'labor_cost',
                label: i18n.t('mes.production_cost_page.k28'),
                field: 'labor_cost',
                render: (value) => formatCurrency(value as number),
              },
              {
                id: 'overhead_cost',
                label: i18n.t('mes.production_cost_page.k29'),
                field: 'overhead_cost',
                render: (value) => formatCurrency(value as number),
              },
              {
                id: 'trend_direction',
                label: i18n.t('mes.production_cost_page.k30'),
                field: 'trend_direction',
                align: 'center',
                render: (value) => getTrendIcon(value as 'up' | 'down' | 'stable'),
              },
              {
                id: 'change_rate',
                label: i18n.t('mes.production_cost_page.k31'),
                field: 'change_rate',
                align: 'center',
                render: (value) => {
                  const rate = value as number;
                  return (
                    <Chip
                      label={`${rate}%`}
                      size='small'
                      color={rate > 0 ? 'error' : rate < 0 ? 'success' : undefined}
                    />
                  );
                },
              },
            ],
            data: trendData.trend_data as unknown as Record<string, unknown>[],
          },
        ];

      case 'forecast':
        if (!forecastData) return [];
        return [
          {
            id: 'forecast-info-table',
            title: i18n.t('mes.production_cost_page.k32'),
            columns: [
              {
                id: 'label',
                label: i18n.t('mes.production_cost_page.k25'),
                field: 'label',
              },
              {
                id: 'value',
                label: i18n.t('mes.production_cost_page.k26'),
                field: 'value',
              },
            ],
            data: [
              {
                label: i18n.t('pages.production_cost_page.k6'),
                value: forecastData.forecast_period,
              },
              {
                label: i18n.t('pages.production_cost_page.k7'),
                value: `${formatCurrency(forecastData.confidence_interval[0])} - ${formatCurrency(forecastData.confidence_interval[1])}`,
              },
              {
                label: i18n.t('pages.production_cost_page.k0'),
                value: forecastData.trend_factor,
              },
              {
                label: i18n.t('pages.production_cost_page.k8'),
                value: forecastData.seasonality_factor,
              },
            ],
          },
        ];

      default:
        return [];
    }
  }, [activeTab, reportData, trendData, forecastData]);

  const loading = useMemo(() => {
    switch (activeTab) {
      case 'period':
        return periodCostReport.isPending;
      case 'trend':
        return costTrend.isPending;
      case 'forecast':
        return costForecast.isPending;
      case 'work-order':
        return loadingWorkOrder;
      default:
        return false;
    }
  }, [
    activeTab,
    periodCostReport.isPending,
    costTrend.isPending,
    costForecast.isPending,
    loadingWorkOrder,
  ]);

  return (
    <StatsPageTemplate
      title={i18n.t('pages.production_cost_page.k0')}
      tabs={tabs}
      tabValue={activeTab}
      onTabChange={(value) => setActiveTab(value as TabValue)}
      statCards={statCards}
      statColumns={4}
      charts={charts}
      tables={tables}
      loading={loading}
      onRefresh={handleRefresh}
      timeRangeOptions={timeRangeOptions}
      timeRange={periodType}
      onTimeRangeChange={(value) => setPeriodType(value as 'month' | 'quarter' | 'year')}
      showSearch={false}
      showExport={false}
    >
      {activeTab === 'work-order' && (
        <Card>
          <CardHeader title={i18n.t('mes.production_cost_page.k33')} />
          <CardContent>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gap: 2,
                mb: 4,
              }}
            >
              <Box sx={{ gridColumn: 'span 6' }}>
                <Input
                  placeholder={i18n.t('mes.production_cost_page.id_34')}
                  value={workOrderId}
                  onChange={(e) => setWorkOrderId(e.target.value)}
                  fullWidth
                />
              </Box>
              <Box sx={{ gridColumn: 'span 2' }}>
                <Button
                  variant='contained'
                  onClick={handleQueryWorkOrderCost}
                  disabled={loadingWorkOrder}
                >
                  {i18n.t('pages.production_cost_page.k9')}
                </Button>
              </Box>
            </Box>
            {workOrderCost && (
              <>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(12, 1fr)',
                    gap: 4,
                    mb: 4,
                  }}
                >
                  <Box sx={{ gridColumn: 'span 3' }}>
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
                  </Box>
                  <Box sx={{ gridColumn: 'span 3' }}>
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
                  </Box>
                  <Box sx={{ gridColumn: 'span 3' }}>
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
                  </Box>
                  <Box sx={{ gridColumn: 'span 3' }}>
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
                  </Box>
                </Box>
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
                            {((workOrderCost.labor_cost / workOrderCost.total_cost) * 100).toFixed(
                              2
                            )}
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
    </StatsPageTemplate>
  );
};

export default ProductionCostPage;
