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

const ProductionCostPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [periodType, setPeriodType] = useState<'month' | 'quarter' | 'year'>('month');
  const [workOrderId, setWorkOrderId] = useState('');
  const addNotification = useNotificationStore((state) => state.addNotification);

  const periodCostReport = useQuery({
    queryKey: ['periodCostReport', periodType],
    queryFn: () => productionCostApi.getPeriodCostReport({ period_type: periodType }),
  });

  const costTrend = useQuery({
    queryKey: ['costTrend'],
    queryFn: () => productionCostApi.getCostTrend({ period_type: 'month' }),
  });

  const costForecast = useQuery({
    queryKey: ['costForecast'],
    queryFn: () => productionCostApi.getCostForecast({ months: 3 }),
  });

  const [workOrderCost, setWorkOrderCost] = useState<WorkOrderCostResult | null>(null);
  const [loadingWorkOrder, setLoadingWorkOrder] = useState(false);

  const handleQueryWorkOrderCost = async () => {
    if (!workOrderId.trim()) {
      addNotification({ title: '警告', message: '请输入工单ID', type: 'warning' });
      return;
    }
    setLoadingWorkOrder(true);
    try {
      const data = await productionCostApi.calculateWorkOrderCost(workOrderId.trim());
      setWorkOrderCost(data.data);
      addNotification({ title: '成功', message: '工单成本计算成功', type: 'success' });
    } catch {
      addNotification({ title: '错误', message: '工单成本计算失败', type: 'error' });
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
    <PageContainer title='生产成本'>
      <Box sx={{ p: 3 }}>
        <Typography
          variant='h4'
          sx={{ mb: 4 }}
        >
          生产成本核算
        </Typography>

        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{ mb: 4 }}
        >
          <Tab
            label='成本汇总'
            icon={<BarChart3 size={20} />}
          />
          <Tab
            label='趋势分析'
            icon={<TrendingUp size={20} />}
          />
          <Tab
            label='成本预测'
            icon={<PieChart size={20} />}
          />
          <Tab
            label='工单查询'
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
                    周期总成本
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Card sx={{ mt: 3 }}>
              <CardHeader title='按产品成本分布' />
              <CardContent>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>产品编码</TableCell>
                      <TableCell>产品名称</TableCell>
                      <TableCell>总成本</TableCell>
                      <TableCell>单位成本</TableCell>
                      <TableCell>占比</TableCell>
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
              <CardHeader title='按车间成本分布' />
              <CardContent>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>车间名称</TableCell>
                      <TableCell>总成本</TableCell>
                      <TableCell>占比</TableCell>
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
            <CardHeader title='成本趋势分析' />
            <CardContent>
              <Grid sx={{ display: 'flex', gap: 2, mb: 4 }}>
                <Grid>
                  <Chip
                    label={`总体趋势: ${trendData.overall_trend === 'up' ? '上升' : trendData.overall_trend === 'down' ? '下降' : '稳定'}`}
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
                    label={`平均变化率: ${trendData.avg_change_rate}%`}
                    size='small'
                  />
                </Grid>
              </Grid>

              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>周期</TableCell>
                    <TableCell>总成本</TableCell>
                    <TableCell>材料成本</TableCell>
                    <TableCell>人工成本</TableCell>
                    <TableCell>制造费用</TableCell>
                    <TableCell>趋势</TableCell>
                    <TableCell>变化率</TableCell>
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
            <CardHeader title='成本预测' />
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
                        预测总成本
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
                        材料成本
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
                        人工成本
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
                        制造费用
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
                  预测周期: {forecastData.forecast_period}
                </Typography>
                <Typography variant='subtitle1'>
                  置信区间: {formatCurrency(forecastData.confidence_interval[0])} -{' '}
                  {formatCurrency(forecastData.confidence_interval[1])}
                </Typography>
                <Typography variant='subtitle1'>趋势因子: {forecastData.trend_factor}</Typography>
                <Typography variant='subtitle1'>
                  季节性因子: {forecastData.seasonality_factor}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {activeTab === 3 && (
          <Card>
            <CardHeader title='工单成本查询' />
            <CardContent>
              <Grid sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2, mb: 4 }}>
                <Grid sx={{ gridColumn: 'span 6' }}>
                  <Input
                    placeholder='输入工单ID'
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
                    查询
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
                            工单编号
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
                            生产订单
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
                            产量
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
                            单位成本
                          </Typography>
                          <Typography variant='h6'>
                            {formatCurrency(workOrderCost.unit_cost)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  <Card sx={{ mt: 3 }}>
                    <CardHeader title='成本汇总' />
                    <CardContent>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>成本类别</TableCell>
                            <TableCell>金额</TableCell>
                            <TableCell>占比</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>材料成本</TableCell>
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
                            <TableCell>人工成本</TableCell>
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
                            <TableCell>制造费用</TableCell>
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
                              <strong>总成本</strong>
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
                      <CardHeader title='成本明细' />
                      <CardContent>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell>类别</TableCell>
                              <TableCell>金额</TableCell>
                              <TableCell>占比</TableCell>
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
                    <option value='month'>本月</option>
                    <option value='quarter'>本季度</option>
                    <option value='year'>本年</option>
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
