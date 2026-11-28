import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
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
  useTheme,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import i18n from '@/i18n';
import { TrendingUp, DollarSign, BarChart3, PieChart } from 'lucide-react';
import { productionCostApi, type WorkOrderCostResult } from '@/api/mes/productionCost';
import { useNotificationStore } from '@/store/notificationStore';
import { CACHE_DURATIONS, QUERY_KEYS } from '@/lib/reactQuery';
import { StatsPageTemplate } from '@/components/templates/StatsPageTemplate';
import type {
  ChartConfig,
  DataTable,
  StatCard,
  TabItem,
} from '@/components/templates/StatsPageTemplate';

type TabValue = 'period' | 'trend' | 'forecast' | 'work-order';

const ProductionCostPage: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<TabValue>('period');
  const [periodType] = useState<'month' | 'quarter' | 'year'>('month');
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

  // 后端 get_cost_trend 的 PeriodQuery 只被 `_params` 吃掉（固定 90 天按周），
  // get_period_cost_report 同样不读 period_type；页面 月/季/年 下拉已撤，这里固定 month。
  const costTrend = useQuery({
    queryKey: QUERY_KEYS.AD_HOC.COSTTREND_BASE,
    queryFn: () => productionCostApi.getCostTrend({ period_type: 'month' }),
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // total=0 时占比没有定义，显示 0.00% 而不是 NaN%
  const costShare = (amount: number, total: number) =>
    total > 0 ? ((amount / total) * 100).toFixed(2) : '0.00';

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
  // 后端 CostTrendData 是并列数组（labels / total_cost / ...），按 index 合成表格与图表行
  const trendPoints = useMemo(() => {
    if (!trendData) return [];
    return trendData.labels.map((label, index) => ({
      period: label,
      total_cost: trendData.total_cost[index] ?? 0,
      material_cost: trendData.material_cost[index] ?? 0,
      labor_cost: trendData.labor_cost[index] ?? 0,
      overhead_cost: trendData.overhead_cost[index] ?? 0,
      avg_unit_cost: trendData.avg_unit_cost[index] ?? 0,
    }));
  }, [trendData]);
  const trendTotal = useMemo(
    () => trendPoints.reduce((sum, point) => sum + point.total_cost, 0),
    [trendPoints]
  );
  const trendAvgUnitCost = useMemo(() => {
    const valued = trendPoints.filter((point) => point.avg_unit_cost > 0);
    if (valued.length === 0) return 0;
    return valued.reduce((sum, point) => sum + point.avg_unit_cost, 0) / valued.length;
  }, [trendPoints]);

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

  // 月/季/年 下拉已撤：后端两个端点都不消费 period_type，控件只是摆设

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
                color={theme.palette.teal.main}
              />
            ),
            color: 'primary',
          },
        ];

      case 'trend':
        // 后端只给真实分桶金额，不给「总体趋势/变化率」这类需要模型口径的判断
        if (trendPoints.length === 0) return [];
        return [
          {
            id: 'trend-total',
            title: i18n.t('mes.production_cost_page.b374_total'),
            value: formatCurrency(trendTotal),
            icon: (
              <DollarSign
                size={20}
                color={theme.palette.teal.main}
              />
            ),
            color: 'primary',
          },
          {
            id: 'trend-avg-unit-cost',
            title: i18n.t('mes.production_cost_page.b374_avg_unit'),
            value: formatCurrency(trendAvgUnitCost),
          },
        ];

      case 'forecast':
      case 'work-order':
      default:
        return [];
    }
  }, [activeTab, reportData, trendPoints, trendTotal, trendAvgUnitCost]);

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
        if (trendPoints.length === 0) return [];
        return [
          {
            id: 'cost-trend',
            title: i18n.t('mes.production_cost_page.k21'),
            type: 'line',
            dataKey: 'total_cost',
            nameKey: 'period',
            data: trendPoints.map((point) => ({
              name: point.period,
              value: point.total_cost,
            })),
          },
          {
            id: 'cost-trend-unit',
            title: i18n.t('mes.production_cost_page.b374_avg_unit'),
            type: 'line',
            dataKey: 'avg_unit_cost',
            nameKey: 'period',
            data: trendPoints.map((point) => ({
              name: point.period,
              value: point.avg_unit_cost,
            })),
          },
        ];

      // 预测/对比：后端显式 503（没有真实口径），这里不出任何图，改为未接入提示
      case 'forecast':
      default:
        return [];
    }
  }, [activeTab, reportData, trendPoints]);

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
        // 后端不再返回 trend_direction / change_rate（那需要模型口径）；只列真实分桶金额
        if (trendPoints.length === 0) return [];
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
                id: 'avg_unit_cost',
                label: i18n.t('mes.production_cost_page.b374_avg_unit'),
                field: 'avg_unit_cost',
                render: (value) => formatCurrency(value as number),
              },
            ],
            data: trendPoints as unknown as Record<string, unknown>[],
          },
        ];

      // 预测/对比：后端 503，无表可出
      case 'forecast':
      default:
        return [];
    }
  }, [activeTab, reportData, trendPoints]);

  const loading = useMemo(() => {
    switch (activeTab) {
      case 'period':
        return periodCostReport.isPending;
      case 'trend':
        return costTrend.isPending;
      case 'forecast':
        return false;
      case 'work-order':
        return loadingWorkOrder;
      default:
        return false;
    }
  }, [activeTab, periodCostReport.isPending, costTrend.isPending, loadingWorkOrder]);

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
      showSearch={false}
      showExport={false}
    >
      {activeTab === 'forecast' && (
        <Alert severity='info'>
          {i18n.t('mes.production_cost_page.b374_forecast_unavailable')}
        </Alert>
      )}
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
                        <Typography variant='h6'>{workOrderCost.quantity}</Typography>
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
                {workOrderCost.data_gaps && workOrderCost.data_gaps.length > 0 && (
                  <Alert
                    severity='warning'
                    sx={{ mt: 3 }}
                  >
                    <Typography variant='body2'>
                      {i18n.t('mes.production_cost_page.b374_gaps_title')}
                    </Typography>
                    <Box
                      component='ul'
                      sx={{ m: 0, mt: 1, pl: 3 }}
                    >
                      {workOrderCost.data_gaps.map((gap) => (
                        <li key={gap}>
                          <Typography variant='body2'>{gap}</Typography>
                        </li>
                      ))}
                    </Box>
                  </Alert>
                )}
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
                            {costShare(workOrderCost.material_cost, workOrderCost.total_cost)}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>{i18n.t('mes.production_cost_page.k40')}</TableCell>
                          <TableCell>{formatCurrency(workOrderCost.labor_cost)}</TableCell>
                          <TableCell>
                            {costShare(workOrderCost.labor_cost, workOrderCost.total_cost)}%
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>{i18n.t('mes.production_cost_page.k41')}</TableCell>
                          <TableCell>{formatCurrency(workOrderCost.overhead_cost)}</TableCell>
                          <TableCell>
                            {costShare(workOrderCost.overhead_cost, workOrderCost.total_cost)}%
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
                            <TableCell>{i18n.t('mes.production_cost_page.b374_sub')}</TableCell>
                            <TableCell>{i18n.t('mes.production_cost_page.b374_desc')}</TableCell>
                            <TableCell align='right'>
                              {i18n.t('mes.production_cost_page.b374_qty')}
                            </TableCell>
                            <TableCell align='right'>
                              {i18n.t('mes.production_cost_page.b374_price')}
                            </TableCell>
                            <TableCell align='right'>
                              {i18n.t('mes.production_cost_page.k45')}
                            </TableCell>
                            <TableCell align='right'>
                              {i18n.t('mes.production_cost_page.k46')}
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {workOrderCost.cost_breakdown.map((item, index) => (
                            <TableRow key={`${item.category}-${item.sub_category}-${index}`}>
                              <TableCell>{item.category}</TableCell>
                              <TableCell>{item.sub_category}</TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell align='right'>
                                {item.quantity} {item.unit}
                              </TableCell>
                              <TableCell align='right'>
                                {item.unit_price > 0 ? formatCurrency(item.unit_price) : '-'}
                              </TableCell>
                              <TableCell align='right'>{formatCurrency(item.amount)}</TableCell>
                              <TableCell align='right'>{item.percentage}%</TableCell>
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
